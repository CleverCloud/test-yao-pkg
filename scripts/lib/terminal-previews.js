import { styleText } from 'node:util';
import textTable from 'text-table';
import stringLength from 'string-length';
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

    const table = this.#previewNames.map((previewName) => {
      const remotePreview = this.#remoteManifest.previews.find(p => p.name === previewName);
      const localPreview = this.#localManifest.previews.find(p => p.name === previewName);
      
      let location;
      if (remotePreview && localPreview) {
        location = 'both';
      } else if (remotePreview) {
        location = 'remote';
      } else {
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
        ...links,
        location,
      ];
    });

    console.log(textTable(table, { stringLength }));
  }
}
