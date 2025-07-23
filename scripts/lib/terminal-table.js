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

  /**
   * Creates a new TerminalTable instance.
   * @param {Array<[string, string?]>} columns - Array of [title, style] pairs for columns
   * @param {Array<Array<string>>} initialData - Array of data rows
   */
  constructor (columns, initialData) {
    this.#columnTitles = columns.map(([title]) => title);
    this.#columnStyles = columns.map(([_, style]) => style);
    this.#rows = initialData;
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
   * Calculates the visible length of a text, stripping ANSI escape sequences.
   * @param {string} text - The text to measure
   * @returns {number} - The visible character count
   */
  #getVisibleLength (text) {
    return stripVTControlCharacters(text).length;
  }

}

