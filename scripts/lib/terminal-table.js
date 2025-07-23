import { stripVTControlCharacters, styleText } from 'node:util';

// Table formatting constants
const CELL_PADDING = 2;
const COLUMN_SEPARATOR = 1;

/**
 * A terminal table renderer with rounded corners and column alignment.
 * Displays tabular data with configurable column styling and formatting.
 */
export class TerminalTable {
  /** @type {Array<string>} */
  #columnTitles;

  /** @type {Array<string?>} */
  #columnStyles;

  /** @type {Array<Array<string>>} */
  #rows;

  /** @type {number} */
  #tableStartLine;

  /** @type {number} */
  #tableHeight;

  /**
   * Creates a new TerminalTable instance.
   * @param {Array<[string, string?]>} columns - Array of [title, style] pairs for columns
   * @param {Array<Array<string>>} initialData - Array of data rows
   */
  constructor (columns, initialData) {
    this.#columnTitles = columns.map(([title]) => title);
    this.#columnStyles = columns.map(([_, style]) => style);
    this.#rows = initialData;
    this.#tableStartLine = null;
    this.#tableHeight = 0;
  }

  /**
   * Renders the table to stdout with rounded borders and proper alignment.
   * @returns {void}
   */
  renderInit () {
    // Hide cursor during table operations
    process.stdout.write('\x1b[?25l');
    
    // Setup cleanup on exit
    this.#setupExitHandlers();

    const headers = this.#columnTitles.map((title, i) => {
      const style = this.#columnStyles[i];
      return style ? styleText(style, title) : title;
    });

    const columnWidths = this.#columnTitles.map((title, i) => {
      const headerLength = this.#getVisibleLength(title);
      const dataLengths = this.#rows.map((row) => this.#getVisibleLength(row[i]));
      return Math.max(headerLength, ...dataLengths);
    });

    const contentWidth = columnWidths.reduce((sum, w) => sum + w, 0);
    const cellPadding = (columnWidths.length + 1) * CELL_PADDING;
    const separatorSpace = (columnWidths.length - 1) * COLUMN_SEPARATOR;
    const totalWidth = contentWidth + cellPadding + separatorSpace;

    const lines = [];
    lines.push('╭' + '─'.repeat(totalWidth - 2) + '╮');
    lines.push(this.#formatRow(headers, columnWidths, true));
    lines.push('├' + '─'.repeat(totalWidth - 2) + '┤');
    this.#rows.forEach(row => lines.push(this.#formatRow(row, columnWidths)));
    lines.push('╰' + '─'.repeat(totalWidth - 2) + '╯');

    console.log(lines.join('\n'));
    
    // Store the table height for future updates
    this.#tableHeight = lines.length;
  }

  /**
   * Formats a table row with proper padding and borders.
   * @param {Array<string>} row - The row data
   * @param {Array<number>} widths - Column widths
   * @param {boolean} isHeader - Whether this is a header row
   * @returns {string} - Formatted row string
   */
  #formatRow (row, widths, isHeader = false) {
    const cells = row.map((cell, i) => {
      let content = cell || '';
      const visibleLength = this.#getVisibleLength(content);
      if (!isHeader && this.#columnStyles[i]) {
        content = styleText(this.#columnStyles[i], content);
      }
      const padding = ' '.repeat(Math.max(0, widths[i] - visibleLength));
      return ` ${content}${padding} `;
    });
    return '│' + cells.join(' ') + '│';
  }

  /**
   * Updates a specific cell in the table data and refreshes only that cell.
   * @param {number} rowIndex - The row index to update
   * @param {number} columnIndex - The column index to update
   * @param {string} newValue - The new value for the cell
   * @returns {void}
   */
  updateData (rowIndex, columnIndex, newValue) {
    if (rowIndex >= 0 && rowIndex < this.#rows.length &&
        columnIndex >= 0 && columnIndex < this.#rows[rowIndex].length) {
      this.#rows[rowIndex][columnIndex] = newValue;
      this.#updateCell(rowIndex, columnIndex, newValue);
    }
  }

  /**
   * Updates a specific cell in the terminal display.
   * @param {number} rowIndex - The row index to update
   * @param {number} columnIndex - The column index to update
   * @param {string} newValue - The new value for the cell
   * @returns {void}
   */
  #updateCell (rowIndex, columnIndex, newValue) {
    // Calculate column widths
    const columnWidths = this.#columnTitles.map((title, i) => {
      const headerLength = this.#getVisibleLength(title);
      const dataLengths = this.#rows.map((row) => this.#getVisibleLength(row[i]));
      return Math.max(headerLength, ...dataLengths);
    });

    // Calculate the row position relative to table start
    // Table structure: top border (1) + header (1) + separator (1) + data rows
    const tableRowPosition = 3 + rowIndex; // 0-based data row + 3 for borders/header
    
    // Calculate column position within the row
    // Each cell format: '│ content padding ' (from #formatRow)
    // Start after left border '│' + space (position 1-based)
    let columnPosition = 1; // Start at column 1 (1-based indexing)
    
    for (let i = 0; i <= columnIndex; i++) {
      columnPosition += 1; // '│'
      columnPosition += 1; // space before content
      if (i === columnIndex) break; // We're at our target cell content start
      columnPosition += columnWidths[i]; // content width
      columnPosition += 1; // space after content
    }

    // Format the new cell content with proper padding
    let content = newValue || '';
    const visibleLength = this.#getVisibleLength(content);
    if (this.#columnStyles[columnIndex]) {
      content = styleText(this.#columnStyles[columnIndex], content);
    }
    const padding = ' '.repeat(Math.max(0, columnWidths[columnIndex] - visibleLength));
    const cellContent = `${content}${padding}`;

    // Save current cursor position
    process.stdout.write('\x1b[s');
    
    // Move cursor to the cell position (relative to current position)
    // Move up to the table row, then to the column position
    process.stdout.write(`\x1b[${this.#tableHeight - tableRowPosition}A`);
    process.stdout.write(`\x1b[${columnPosition}G`);
    
    // Write the cell content
    process.stdout.write(cellContent);
    
    // Restore cursor position
    process.stdout.write('\x1b[u');
  }

  /**
   * Sets up exit handlers to restore cursor and terminal state.
   * @returns {void}
   */
  #setupExitHandlers () {
    const cleanup = () => {
      // Clear the ^C characters and show cursor
      process.stdout.write('\r\x1b[K'); // Clear current line
      process.stdout.write('\x1b[?25h'); // Show cursor
      process.stdout.write('\x1b[0m');   // Reset all styles
    };

    // Handle normal exit
    process.on('exit', cleanup);
    
    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      cleanup();
      process.exit(130);
    });
    
    // Handle SIGTERM
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(143);
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      cleanup();
      console.error('Uncaught Exception:', err);
      process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      cleanup();
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  /**
   * Calculates the visible length of a text, stripping ANSI escape sequences.
   * @param {string} text - The text to measure
   * @returns {number} - The visible character count
   */
  #getVisibleLength (text) {
    return stripVTControlCharacters(text).length;
  }

}

