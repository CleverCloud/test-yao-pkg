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

  /** @type {Array<number>} */
  #columnWidths;

  /** @type {number} */
  #tableHeight;

  /** @type {Map<string, number>} */
  #visibleLengthCache;

  /**
   * Creates a new TerminalTable instance.
   * @param {Array<[string, string?]>} columns - Array of [title, style] pairs for columns
   * @param {Array<Array<string>>} rows - Array of data rows
   */
  constructor (columns, rows) {
    // Validate input
    if (!Array.isArray(columns) || columns.length === 0) {
      throw new Error('Columns array cannot be empty');
    }
    if (!Array.isArray(rows)) {
      throw new Error('Rows must be an array');
    }
    
    this.#columnTitles = columns.map(([title]) => title);
    this.#columnStyles = columns.map(([, style]) => style);
    this.#rows = rows;
    this.#columnWidths = null;
    this.#tableHeight = 0;
    this.#visibleLengthCache = new Map();
    
    // Validate that all rows have the correct number of columns
    const expectedColumns = columns.length;
    rows.forEach((row, index) => {
      if (!Array.isArray(row) || row.length !== expectedColumns) {
        throw new Error(`Row ${index} has ${row?.length || 0} columns, expected ${expectedColumns}`);
      }
    });
  }

  /**
   * Calculates and caches column widths based on content.
   * @returns {Array<number>} Array of column widths
   */
  #calculateColumnWidths () {
    if (this.#columnWidths) {
      return this.#columnWidths;
    }
    
    this.#columnWidths = this.#columnTitles.map((title, i) => {
      const headerLength = this.#getVisibleLength(title);
      const dataLengths = this.#rows.map((row) => this.#getVisibleLength(row[i] || ''));
      return Math.max(headerLength, ...dataLengths);
    });
    
    return this.#columnWidths;
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

    const columnWidths = this.#calculateColumnWidths();

    const contentWidth = columnWidths.reduce((sum, w) => sum + w, 0);
    const cellPadding = columnWidths.length * CELL_PADDING * 2; // 2 spaces per cell (left + right)
    const separatorSpace = (columnWidths.length - 1) * COLUMN_SEPARATOR;
    const totalWidth = contentWidth + cellPadding + separatorSpace + 2; // +2 for border chars

    const lines = [];
    lines.push('╭' + '─'.repeat(totalWidth - 2) + '╮');
    lines.push(this.#formatRow(headers, columnWidths, true));
    lines.push('├' + '─'.repeat(totalWidth - 2) + '┤');
    this.#rows.forEach(row => lines.push(this.#formatRow(row, columnWidths)));
    lines.push('╰' + '─'.repeat(totalWidth - 2) + '╯');

    // Use process.stdout.write for consistency
    process.stdout.write(lines.join('\n') + '\n');

    // Store the table height and current cursor position for future updates
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
    // Validate indices
    if (rowIndex < 0 || rowIndex >= this.#rows.length ||
        columnIndex < 0 || columnIndex >= this.#columnTitles.length) {
      return;
    }
    
    // Check if content change might affect column width
    const oldValue = this.#rows[rowIndex][columnIndex] || '';
    const oldLength = this.#getVisibleLength(oldValue);
    const newLength = this.#getVisibleLength(newValue || '');
    const currentWidth = this.#columnWidths?.[columnIndex] || 0;
    
    // If new content is longer than current column width, invalidate caches
    if (newLength > currentWidth) {
      this.#columnWidths = null;
      // Clear visible length cache to prevent memory leaks from old values
      if (this.#visibleLengthCache.size > 1000) {
        this.#visibleLengthCache.clear();
      }
    }
    
    this.#rows[rowIndex][columnIndex] = newValue;
    this.#updateCell(rowIndex, columnIndex, newValue);
  }

  /**
   * Updates a specific cell in the terminal display.
   * @param {number} rowIndex - The row index to update
   * @param {number} columnIndex - The column index to update
   * @param {string} newValue - The new value for the cell
   * @returns {void}
   */
  #updateCell (rowIndex, columnIndex, newValue) {
    const columnWidths = this.#calculateColumnWidths();

    // Calculate the absolute row position in the table
    // Table structure: top border (1) + header (1) + separator (1) + data rows (0-based)
    const absoluteRowPosition = 3 + rowIndex;

    // Calculate column position within the row
    // Row format: '│ content padding │ content padding │...'
    let columnPosition = 2; // Start after '│ ' (1-based indexing)
    
    for (let i = 0; i < columnIndex; i++) {
      columnPosition += columnWidths[i]; // content width
      columnPosition += 2; // space after content + space before next content
      columnPosition += 1; // column separator '│' or ' '
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

    // Move cursor to the specific cell position
    // Move up by the number of lines from current position to the target row
    const linesToMoveUp = this.#tableHeight - absoluteRowPosition;
    if (linesToMoveUp > 0) {
      process.stdout.write(`\x1b[${linesToMoveUp}A`);
    } else if (linesToMoveUp < 0) {
      process.stdout.write(`\x1b[${Math.abs(linesToMoveUp)}B`);
    }
    
    // Move to the specific column position
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
      process.stderr.write(`Uncaught Exception: ${err.message}\n`);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      cleanup();
      process.stderr.write(`Unhandled Rejection: ${reason}\n`);
      process.exit(1);
    });
  }

  /**
   * Calculates the visible length of a text, stripping ANSI escape sequences.
   * Uses caching to improve performance for repeated calculations.
   * @param {string} text - The text to measure
   * @returns {number} - The visible character count
   */
  #getVisibleLength (text) {
    if (!text) return 0;
    
    if (this.#visibleLengthCache.has(text)) {
      return this.#visibleLengthCache.get(text);
    }
    
    const length = stripVTControlCharacters(text).length;
    this.#visibleLengthCache.set(text, length);
    return length;
  }

}

