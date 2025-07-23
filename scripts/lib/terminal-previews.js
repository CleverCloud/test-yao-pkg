import { createTerminalLink, getEmoji } from './utils.js';
import { TerminalTable } from './terminal-table.js';

/**
 * @typedef {import('./preview-client.types.d.ts').Manifest} Manifest
 * @typedef {import('./preview-client.types.d.ts').Preview} Preview
 * @typedef {import('./preview-client.types.d.ts').PreviewUrl} PreviewUrl
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
  /** @type {string} */
  #os;

  /**
   * @param {Manifest} remoteManifest - Remote manifest containing preview information
   * @param {Manifest} localManifest - Local manifest containing preview information
   * @param {string} os - The current OS
   */
  constructor (remoteManifest, localManifest, os) {
    this.#remoteManifest = remoteManifest;
    this.#localManifest = localManifest;
    this.#os = os;

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
      ['STATE             '],
    ];

    const table = new TerminalTable(columns, rows);
    table.renderInit();

    this.#previewNames.forEach((previewName, index) => {
      const remotePreview = this.#remoteManifest.previews.find((p) => p.name === previewName);
      const localPreview = this.#localManifest.previews.find((p) => p.name === previewName);

      /** @type {string|null} */
      const remoteChecksum = remotePreview?.urls.find((u) => u.os === this.#os)?.checksum.value;
      /** @type {string|null} */
      const localChecksum = localPreview?.urls.find((u) => u.os === this.#os)?.checksum.value;

      if (remoteChecksum != null && localChecksum != null) {
        if (remoteChecksum === localChecksum) {
          this.#keep(localPreview);
        }
        else {
          this.#updatePreview(table, index);
        }
      }
      else if (remoteChecksum != null && localChecksum == null) {
        if (localPreview != null) {
          this.#updatePreview(table, index);
        }
        else {
          this.#downloadPreview(table, index);
        }
      }
      else if (remoteChecksum == null && localChecksum != null) {
        this.#deletePreview(table, index);
      }
      else {
        table.updateData(index, 6, 'Ignored');
      }

    });
  }

  #keep (table, index) {
    table.updateData(index, 6, 'Already up-to-date');
  }

  #updatePreview (table, index) {
    table.updateData(index, 6, 'Updating…');
    setTimeout(() => {
      table.updateData(index, 6, 'Updated!');
    }, 5000);
    setTimeout(() => {
    }, 7000);
  }

  #downloadPreview (table, index) {
    table.updateData(index, 6, 'Downloading…');
    setTimeout(() => {
      table.updateData(index, 6, 'Downloaded!');
    }, 5000);
    setTimeout(() => {
    }, 7000);
  }

  #deletePreview (table, index) {
    table.updateData(index, 6, 'Deleting…');
    setTimeout(() => {
      table.updateData(index, 6, 'Deleted!');
    }, 5000);
    setTimeout(() => {
    }, 7000);
  }
}
