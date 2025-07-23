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
    // Cursor should be positioned right after the table from renderInit
    // Move cursor up to start of table, clear it, and re-render
    process.stdout.write(`\x1b[${this.#tableHeight}A`);
    
    // Clear all table lines
    for (let i = 0; i < this.#tableHeight; i++) {
      process.stdout.write('\x1b[2K'); // Clear current line
      if (i < this.#tableHeight - 1) {
        process.stdout.write('\x1b[1B'); // Move down one line
      }
    }
    
    // Move cursor back to start
    process.stdout.write(`\x1b[${this.#tableHeight - 1}A`);
    
    // Re-render the table
    this.renderInit();
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

