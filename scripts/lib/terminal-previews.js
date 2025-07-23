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
  /** @type {TerminalTable} */
  #table;

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
      ['STATE                                    '],
    ];

    this.#table = new TerminalTable(columns, rows);
    this.#table.renderInit();

    this.#previewNames.forEach((previewName, index) => {
      const remotePreview = this.#remoteManifest.previews.find((p) => p.name === previewName);
      const localPreview = this.#localManifest.previews.find((p) => p.name === previewName);

      /** @type {string|null} */
      const remoteChecksum = remotePreview?.urls.find((u) => u.os === this.#os)?.checksum.value;
      /** @type {string|null} */
      const localChecksum = localPreview?.urls.find((u) => u.os === this.#os)?.checksum.value;

      if (remoteChecksum != null && localChecksum != null) {
        if (remoteChecksum === localChecksum) {
          this.#keep(index);
        }
        else {
          this.#updatePreview(index);
        }
      }
      else if (remoteChecksum != null && localChecksum == null) {
        if (localPreview != null) {
          this.#updatePreview(index);
        }
        else {
          this.#downloadPreview(index);
        }
      }
      else if (remoteChecksum == null && localChecksum != null) {
        this.#deletePreview(index);
      }
      else {
        this.#table.updateData(index, 6, 'Ignored');
      }

    });

    setTimeout(() => {
    }, 15000);
  }

  #keep (index) {
    this.#table.updateData(index, 6, 'OK!');
  }

  #updatePreview (index) {
    this.#table.updateData(index, 6, 'Updating…');
    setTimeout(() => {
      this.#table.updateData(index, 6, 'Updated!');
    }, 5000);
  }

  #downloadPreview (index) {
    this.#table.updateData(index, 6, 'Downloading .tar.gz…');
    // TODO download the tar.gz with fetch to `/tmp/previews-${previewName}`, use fetch
    // TODO Create the tmp dir
    this.#table.updateData(index, 6, 'Extracting .tar.gz…');
    // TODO extract the tar.gz to /tmp/previews-${previewName}, use exec from utils
    this.#table.updateData(index, 6, 'Installing binary…');
    // TODO copy the binary to `.preview-binaries/clever--${previewName}`, use node.js fs
    this.#table.updateData(index, 6, 'Cleaning…');
    // TODO delete the tmp dir
    this.#table.updateData(index, 6, 'OK!');
  }

  #deletePreview (index) {
    this.#table.updateData(index, 6, 'Deleting binary…');
    // TODO delete the binary and await, location is `.preview-binaries/clever--${previewName}`
    this.#table.updateData(index, 6, 'Deleted!');
  }
}
