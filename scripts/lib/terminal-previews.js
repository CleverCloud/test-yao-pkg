import { styleText } from 'node:util';
import { createTerminalLink, formatBranchName, getEmoji } from './utils.js';

/**
 * @typedef {import('./preview-client.types.d.ts').Manifest} Manifest
 * @typedef {import('./preview-client.types.d.ts').Preview} Preview
 */

/**
 * Handles display and management of preview builds
 */
export class TerminalPreviews {

  /** @type {Manifest} */
  #remoteManifest;
  /** @type {Manifest} */
  #localManifest;
  /** @type {Array<string>} */
  #previewNames;

  /**
   * @param {Manifest} remoteManifest - Remote manifest containing preview information
   * @param {Manifest} localManifest - Local manifest containing preview information
   */
  constructor (remoteManifest, localManifest) {
    this.#remoteManifest = remoteManifest;
    this.#localManifest = localManifest;

    this.#previewNames = [];
    this.#remoteManifest.previews.forEach((p) => {
      if (!this.#previewNames.includes(p.name)) {
        this.#previewNames.push(p.name);
      }
    });
    this.#localManifest.previews.forEach((p) => {
      if (!this.#previewNames.includes(p.name)) {
        this.#previewNames.push(p.name);
      }
    });
    this.#previewNames.sort();
  }

  initDisplay () {

    const data = this.#previewNames.map((previewName) => {
      const remotePreview = this.#remoteManifest.previews.find(p => p.name === previewName);
      const localPreview = this.#localManifest.previews.find(p => p.name === previewName);

      let location;
      if (remotePreview && localPreview) {
        location = 'both';
      }
      else if (remotePreview) {
        location = 'remote';
      }
      else {
        location = 'local';
      }

      // Use remote preview data if available, otherwise local
      const preview = remotePreview || localPreview;

      const date = preview.updatedAt.substring(0, 10);
      const dateObject = new Date(preview.updatedAt);
      const time = dateObject.toLocaleTimeString();
      const links = preview.urls.map((u) => {
        return `${getEmoji(u.os)} ${createTerminalLink(u.url, u.os)}`;
      });

      return [
        styleText('yellow', formatBranchName(preview.name)),
        styleText('blue', preview.commitId.substring(0, 8)),
        date,
        time,
        styleText('green', preview.author),
        links.join('  '),
        location,
      ];
    });

    const headers = [
      styleText('yellow', 'NAME'),
      styleText('blue', 'COMMIT ID'),
      'DATE',
      'TIME',
      styleText('green', 'AUTHOR'),
      styleText('blue', 'DOWNLOAD LINKS'),
      'LOCATION',
    ];

    // const bigtext = textTable(headers, data);
    // console.log(`╭${'─'.repeat(bigtext.split('\n')[0].length)}╮`);
    // // │ >   Type your message or @path/to/file                                                                                          │
    // // ╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯
    // console.log(bigtext);
    console.log(textTable(headers, data));
  }
}

function textTable (headers, data) {
  if (!headers.length || !data.length) return '';
  
  // Calculate column widths by finding the max length in each column
  const columnWidths = headers.map((header, i) => {
    const headerLength = stripAnsi(header).length;
    const maxDataLength = Math.max(...data.map(row => stripAnsi(row[i] || '').length));
    return Math.max(headerLength, maxDataLength);
  });
  
  // Format a row with proper padding
  const formatRow = (row, widths) => {
    const cells = row.map((cell, i) => {
      const content = cell || '';
      const visibleLength = stripAnsi(content).length;
      const padding = ' '.repeat(Math.max(0, widths[i] - visibleLength));
      return ` ${content}${padding} `;
    });
    return '│' + cells.join('') + '│';
  };
  
  // Calculate total width for top/bottom borders
  const totalWidth = columnWidths.reduce((sum, w) => sum + w + 2, 2);
  
  // Build the table
  const lines = [];
  lines.push('╭' + '─'.repeat(totalWidth - 2) + '╮');
  lines.push(formatRow(headers, columnWidths));
  lines.push('├' + '─'.repeat(totalWidth - 2) + '┤');
  data.forEach(row => lines.push(formatRow(row, columnWidths)));
  lines.push('╰' + '─'.repeat(totalWidth - 2) + '╯');
  
  return lines.join('\n');
}

// Helper function to strip ANSI escape codes for length calculation
function stripAnsi(str) {
  return str.replace(/\u001b\[[0-9;]*m/g, '').replace(/\u001b]8;;[^\u001b]*\u001b\\([^\u001b]*)\u001b]8;;\u001b\\/g, '$1');
}
