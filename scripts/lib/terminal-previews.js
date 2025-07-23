import { createTerminalLink, getEmoji } from './utils.js';
import { TerminalTable } from './terminal-table.js';

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

    const rows = this.#previewNames.map((previewName) => {
      const remotePreview = this.#remoteManifest.previews.find((p) => p.name === previewName);
      const localPreview = this.#localManifest.previews.find((p) => p.name === previewName);

      // Use remote preview data if available, otherwise local
      const preview = remotePreview ?? localPreview;
      const date = preview.updatedAt.substring(0, 10);
      const dateObject = new Date(preview.updatedAt);
      const time = dateObject.toLocaleTimeString();
      const links = preview.urls.map((u) => {
        return `${getEmoji(u.os)} ${createTerminalLink(u.url, u.os)}`;
      });

      return [
        preview.name,
        preview.commitId.substring(0, 8),
        date,
        time,
        preview.author,
        links.join(' '),
        '',
      ];
    });

    const columns = [
      ['NAME', 'yellow'],
      ['COMMIT ID', 'blue'],
      ['DATE'],
      ['TIME'],
      ['AUTHOR', 'green'],
      ['DOWNLOAD LINKS', 'blue'],
      ['STATE          '],
    ];

    const table = new TerminalTable(columns, rows);
    table.renderInit();

    // TODO iterate over this.#previewNames
    // TODO for each one, determine the action:
    // - keep: remote and local exist and checksums for current OS match
    // - update: remote and local exist but checksums for current OS don't match
    // - download: local does not exist
    // - delete: remote does not exist anymore
    // TODO NOTES:
    // - you will need to get the os from the constructor to a private field
    // - call table.update(index of the iteration, 6, action)
  }
}
