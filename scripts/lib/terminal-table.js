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

  /** @type {Array<number>} */
  #columnWidths;

  /** @type {Array<Array<string>>} */
  #rows;

  /** @type {number} */
  #tableHeight;

  /**
   * Creates a new TerminalTable instance.
   * @param {Array<[string, string?]>} columns - Array of [title, style] pairs for columns
   * @param {Array<Array<string>>} rows - Array of data rows
   */
  constructor (columns, rows) {
    this.#columnTitles = columns.map(([title]) => title);
    this.#columnStyles = columns.map(([, style]) => style);
    this.#columnWidths = this.#columnTitles.map((title, i) => {
      const headerLength = this.#getVisibleLength(title);
      const dataLengths = rows.map((row) => this.#getVisibleLength(row[i] || ''));
      return Math.max(headerLength, ...dataLengths);
    });
    this.#rows = rows;
    // Table height is always header + rows + borders
    this.#tableHeight = this.#rows.length + 1 + 3;
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

    const contentWidth = this.#columnWidths.reduce((sum, w) => sum + w, 0);
    // Each cell has format ` content ` (2 spaces per cell) and cells are joined with ' ' (1 space between cells)
    const cellPadding = this.#columnWidths.length * 2; // 2 spaces per cell (left + right padding)
    const separatorSpace = (this.#columnWidths.length - 1) * 1; // 1 space between cells from join
    const totalWidth = contentWidth + cellPadding + separatorSpace + 2; // +2 for left and right border chars

    console.log('╭' + this.#line(totalWidth, '─') + '╮');
    console.log('│' + this.#formatRow(headers, this.#columnWidths, true) + '│');
    console.log('├' + this.#line(totalWidth, '─') + '┤');
    for (const row of this.#rows) {
      console.log('│' + this.#formatRow(row, this.#columnWidths) + '│');
    }
    console.log('╰' + this.#line(totalWidth, '─') + '╯');
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
    // Truncate the content if longer than initial column width
    const currentWidth = this.#columnWidths?.[columnIndex] || 0;
    const truncatedValue = this.#getVisibleLength(newValue || '') > currentWidth
      ? this.#truncateToWidth(newValue || '', currentWidth)
      : newValue || '';

    this.#rows[rowIndex][columnIndex] = truncatedValue;
    this.#updateCell(rowIndex, columnIndex, truncatedValue);
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
      const paddedContent = content + padding;
      return ` ${paddedContent} `;
    });
    return cells.join(' ');
  }

  /**
   * Updates a specific cell in the terminal display.
   * @param {number} rowIndex - The row index to update
   * @param {number} columnIndex - The column index to update
   * @param {string} newValue - The new value for the cell
   * @returns {void}
   */
  #updateCell (rowIndex, columnIndex, newValue) {
    const columnWidths = this.#columnWidths;

    // Calculate the absolute row position in the table
    // Table structure: top border (1) + header (1) + separator (1) + data rows (0-based)
    const absoluteRowPosition = 1 + 1 + 1 + +rowIndex;

    // Calculate column position within the row
    // Row format from #formatRow: '│ content1padding1  content2padding2  content3padding3 │'
    // Each cell is ` ${content}${padding} ` and cells are joined with ' '
    // Between cells: trailing_space + join_space + leading_space = 3 spaces total
    let columnPosition = 2; // Start after '│ ' (position where first cell content starts)

    for (let i = 0; i < columnIndex; i++) {
      columnPosition += columnWidths[i]; // content width of previous cell
      columnPosition += 1; // trailing space from previous cell ` content `
      columnPosition += 1; // join space from cells.join(' ')
      columnPosition += 1; // leading space from current cell ` content `
    }

    // Format the new cell content with proper padding
    let content = newValue || '';
    const visibleLength = this.#getVisibleLength(content);
    if (this.#columnStyles[columnIndex]) {
      content = styleText(this.#columnStyles[columnIndex], content);
    }
    const padding = ' '.repeat(Math.max(0, columnWidths[columnIndex] - visibleLength));
    const cellContent = `${content}${padding}`;

    // Save current cursor position (no Node.js equivalent)
    process.stdout.write('\x1b[s');

    // Move cursor to the specific cell position
    const linesToMoveUp = this.#tableHeight - absoluteRowPosition;
    if (linesToMoveUp !== 0) {
      process.stdout.moveCursor(0, -linesToMoveUp);
    }

    // Move to the specific column position
    process.stdout.cursorTo(columnPosition);

    // Write the cell content
    process.stdout.write(cellContent);

    // Restore cursor position (no Node.js equivalent)
    process.stdout.write('\x1b[u');
  }

  /**
   * Sets up exit handlers to restore cursor and terminal state.
   * @returns {void}
   */
  #setupExitHandlers () {
    const cleanup = () => {
      // Clear the ^C characters and show cursor
      process.stdout.cursorTo(0);        // Move to start of line
      process.stdout.clearLine(0);       // Clear from cursor to end
      process.stdout.write('\x1b[?25h'); // Show cursor (no Node.js equivalent)
      process.stdout.write('\x1b[0m');   // Reset all styles (no Node.js equivalent)
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
   * Generates a horizontal line for table borders.
   * @param {number} width - The total width including border characters
   * @param {string} _ - Ignored parameter for code decoration/alignment
   * @returns {string} - The horizontal line string
   */
  #line (width, _) {
    return '─'.repeat(width - 2);
  }

  /**
   * Calculates the visible length of a string by stripping VT control characters.
   * @param {string} text - The text to measure
   * @returns {number} - The visible character count
   */
  #getVisibleLength (text) {
    return stripVTControlCharacters(text).length;
  }

  /**
   * Truncates text to fit within a specified visible width.
   * @param {string} text - The text to truncate
   * @param {number} maxWidth - The maximum visible width
   * @returns {string} - The truncated text
   */
  #truncateToWidth (text, maxWidth) {
    // LATER: Consider using Intl.Segmenter for proper grapheme cluster handling
    if (maxWidth <= 0) return '';

    const visibleLength = this.#getVisibleLength(text);
    if (visibleLength <= maxWidth) return text;

    // Simple truncation - could be enhanced to handle ANSI codes properly
    const stripped = stripVTControlCharacters(text);
    return stripped.substring(0, maxWidth - 1) + '…';
  }

}

