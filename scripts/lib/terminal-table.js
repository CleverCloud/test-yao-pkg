import { styleText } from 'node:util';

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
      const headerLength = title.length;
      // TODO assume all cells have a string content
      const dataLengths = this.#rows.map((row) => (row[i] || '').length);
      // TODO group these 2 Math.max
      const maxDataLength = Math.max(...dataLengths);
      return Math.max(headerLength, maxDataLength);
    });

    // TODO could this me a private method?
    const formatRow = (row, widths, isHeader = false) => {
      const cells = row.map((cell, i) => {
        // TODO assuming text before styling does not have ansi codes, could we compute the visiblelength before and ditch the stripAnsi?
        let content = cell || '';
        if (!isHeader && this.#columnStyles[i]) {
          content = styleText(this.#columnStyles[i], content);
        }
        const visibleLength = stripAnsi(content).length;
        const padding = ' '.repeat(Math.max(0, widths[i] - visibleLength));
        return ` ${content}${padding} `;
      });
      return '│' + cells.join(' ') + '│';
    };

    // TODO use top of the file upper snake case const for the spacing values
    const totalWidth = columnWidths.reduce((sum, w) => sum + w + 2, 2) + (columnWidths.length - 1) * 1;

    const lines = [];
    lines.push('╭' + '─'.repeat(totalWidth - 2) + '╮');
    lines.push(formatRow(headers, columnWidths, true));
    lines.push('├' + '─'.repeat(totalWidth - 2) + '┤');
    this.#rows.forEach(row => lines.push(formatRow(row, columnWidths)));
    lines.push('╰' + '─'.repeat(totalWidth - 2) + '╯');

    console.log(lines.join('\n'));
  }
}

/**
 * Strips ANSI escape codes from a string.
 * @param {string} str - The string potentially containing ANSI codes
 * @returns {string} - The string with ANSI codes removed
 */
function stripAnsi (str) {
  return str.replace(/\u001b\[[0-9;]*m/g, '').replace(/\u001b]8;;[^\u001b]*\u001b\\([^\u001b]*)\u001b]8;;\u001b\\/g, '$1');
}
