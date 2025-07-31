import { stripVTControlCharacters, styleText } from 'node:util';

/**
 * @typedef {import('./common.types.js').StyleTextFormat} StyleTextFormat
 */

// ANSI escape sequences
const ANSI = {
  HIDE_CURSOR: '\x1b[?25l',
  SHOW_CURSOR: '\x1b[?25h',
  SAVE_CURSOR: '\x1b[s',
  RESTORE_CURSOR: '\x1b[u',
  RESET_STYLES: '\x1b[0m',
};

const EMPTY_MESSAGE = 'No previews right now';

/**
 * A terminal table renderer with rounded borders and column alignment.
 * Provides dynamic cell updates and proper terminal state management.
 * Displays tabular data with configurable column styling and formatting.
 */
export class TerminalTable {
  /** @type {Array<string>} */
  #columnTitles;

  /** @type {Array<StyleTextFormat>} */
  #columnStyles;

  /** @type {Array<number>} */
  #columnWidths;

  /** @type {Array<Array<string>>} */
  #rows;

  /** @type {number} */
  #tableHeight;

  /** @type {number} */
  #tableStartLine;

  /**
   * Creates a new TerminalTable instance.
   * @param {Array<[string, StyleTextFormat]>} columns - Array of [title, style] pairs for columns
   * @param {Array<Array<string>>} rows - Array of data rows
   */
  constructor(columns, rows) {
    this.#columnTitles = columns.map(([title]) => title);
    this.#columnStyles = columns.map(([_title, style]) => style);
    this.#columnWidths = this.#columnTitles.map((title, i) => {
      const headerLength = this.#getVisibleLength(title);
      const dataLengths = rows.map((row) => this.#getVisibleLength(row[i] || ''));
      return Math.max(headerLength, ...dataLengths);
    });
    this.#rows = rows;
    // Table height is always header + rows + borders
    this.#tableHeight = this.#rows.length + 1 + 3;
    this.#tableStartLine = 0; // Will be set when table is rendered
  }

  /**
   * Renders the initial table to stdout with rounded borders and proper alignment.
   * @returns {void}
   */
  renderInit() {
    process.stdout.write(ANSI.HIDE_CURSOR);

    // Setup cleanup on exit
    this.#setupExitHandlers();

    const headers = this.#columnTitles.map((title, i) => {
      const style = this.#columnStyles[i];
      return style !== 'none' ? styleText(style, title) : title;
    });

    const contentWidth = this.#columnWidths.reduce((sum, w) => sum + w, 0);
    // Each cell has format ` content ` (2 spaces per cell) and cells are joined with ' ' (1 space between cells)
    const cellPadding = this.#columnWidths.length * 2; // 2 spaces per cell (left + right padding)
    const separatorSpace = (this.#columnWidths.length - 1) * 1; // 1 space between cells from join
    const totalWidth = contentWidth + cellPadding + separatorSpace + 2; // +2 for left and right border chars

    console.log('╭' + '─'.repeat(totalWidth - 2) + '╮');
    console.log('│' + this.#formatRow(headers, this.#columnWidths, true) + '│');
    console.log('├' + '─'.repeat(totalWidth - 2) + '┤');
    this.#rows.forEach((r) => console.log('│' + this.#formatRow(r, this.#columnWidths) + '│'));
    if (this.#rows.length === 0) {
      console.log('│ ' + styleText('italic', EMPTY_MESSAGE) + ' '.repeat(totalWidth - EMPTY_MESSAGE.length - 3) + '│');
    }
    console.log('╰' + '─'.repeat(totalWidth - 2) + '╯');
  }  /**
   * Updates a specific cell in the table data and refreshes only that cell.
   * @param {number} rowIndex - The row index to update
   * @param {number} columnIndex - The column index to update
   * @param {string} newValue - The new value for the cell
   * @param {StyleTextFormat} [style] - Optional style to apply to the cell
   * @returns {void}
   */
  updateData(rowIndex, columnIndex, newValue, style) {
    // Check if content change might affect column width
    // Truncate the content if longer than initial column width
    const currentWidth = this.#columnWidths?.[columnIndex] || 0;
    const truncatedValue =
      this.#getVisibleLength(newValue || '') > currentWidth
        ? this.#truncateToWidth(newValue || '', currentWidth)
        : newValue || '';

    this.#rows[rowIndex][columnIndex] = truncatedValue;
    this.#updateCell(rowIndex, columnIndex, truncatedValue, style);
  }

  /**
   * Formats a table row with proper padding and borders.
   * @param {Array<string>} row - The row data
   * @param {Array<number>} widths - Column widths
   * @param {boolean} isHeader - Whether this is a header row
   * @returns {string} - Formatted row string
   */
  #formatRow(row, widths, isHeader = false) {
    return row
      .map((cell, i) => {
        let content = cell || '';
        const visibleLength = this.#getVisibleLength(content);
        const style = this.#columnStyles[i];
        if (!isHeader && style !== 'none') {
          content = styleText(style, content);
        }
        const padding = ' '.repeat(Math.max(0, widths[i] - visibleLength));
        const paddedContent = content + padding;
        return ` ${paddedContent} `;
      })
      .join(' ');
  }

  /**
   * Updates a specific cell in the terminal display.
   * @param {number} rowIndex - The row index to update
   * @param {number} columnIndex - The column index to update
   * @param {string} newValue - The new value for the cell
   * @param {StyleTextFormat} [style] - Optional style to apply to the cell
   * @returns {void}
   */
  #updateCell(rowIndex, columnIndex, newValue, style) {
    // Simple approach: just disable live updates for macOS compatibility
    // On problematic terminals, we'll simply not update the display
    // The data is still updated internally via updateData()

    if (process.platform === 'darwin') {
      // On macOS, skip live updates to avoid display issues
      return;
    }

    // For other platforms, keep the row redraw approach
    const rowData = this.#rows[rowIndex].map((cell, i) => {
      let content = cell || '';
      const cellStyle = (i === columnIndex && style) ? style : this.#columnStyles[i];
      if (cellStyle !== 'none') {
        content = styleText(cellStyle, content);
      }
      return content;
    });

    const formattedRow = '│' + this.#formatRow(rowData, this.#columnWidths) + '│';
    const targetRowFromBottom = this.#tableHeight - (3 + rowIndex);

    process.stdout.write(ANSI.SAVE_CURSOR);

    if (targetRowFromBottom > 0) {
      process.stdout.write(`\x1b[${targetRowFromBottom}A`);
    }

    process.stdout.write('\r\x1b[K');
    process.stdout.write(formattedRow);
    process.stdout.write(ANSI.RESTORE_CURSOR);
  }  /**
   * Calculates the visible length of a string by stripping VT control characters.
   * @param {string} text - The text to measure
   * @returns {number} - The visible character count
   */
  #getVisibleLength(text) {
    return stripVTControlCharacters(text).length;
  }

  /**
   * Truncates text to fit within a specified visible width.
   * @param {string} text - The text to truncate
   * @param {number} maxWidth - The maximum visible width
   * @returns {string} - The truncated text
   */
  #truncateToWidth(text, maxWidth) {
    if (maxWidth <= 0) {
      return '';
    }

    const visibleLength = this.#getVisibleLength(text);
    if (visibleLength <= maxWidth) {
      return text;
    }

    const stripped = stripVTControlCharacters(text);
    return stripped.substring(0, maxWidth - 1) + '…';
  }

  /**
   * Sets up process exit handlers to restore cursor and terminal state on exit.
   * Handles normal exit, SIGINT, SIGTERM, uncaught exceptions, and unhandled rejections.
   * @returns {void}
   */
  #setupExitHandlers() {
    process.on('exit', () => this.#cleanExit());
    process.on('SIGINT', () => this.#cleanExit(130));
    process.on('SIGTERM', () => this.#cleanExit(143));
    process.on('uncaughtException', (e) => this.#cleanExit(1, `Uncaught Exception: ${e.message}`));
    process.on('unhandledRejection', (reason) => this.#cleanExit(1, `Unhandled Rejection: ${reason}`));
  }

  /**
   * Performs clean exit by restoring cursor visibility and clearing styles.
   * @param {number} [code] - Exit code (defaults to 0)
   * @param {string} [error] - Optional error message to display
   * @returns {void}
   */
  #cleanExit(code, error) {
    // Clear the ^C characters and show cursor
    process.stdout.cursorTo(0);
    process.stdout.clearLine(0);
    process.stdout.write(ANSI.SHOW_CURSOR);
    process.stdout.write(ANSI.RESET_STYLES);
    if (error != null) {
      console.error(error);
    }
    process.exit(code);
  }
}
