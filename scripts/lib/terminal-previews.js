import { clearDirectory, createTerminalLink, exec, getEmoji } from './utils.js';
import { TerminalTable } from './terminal-table.js';
import fs from 'node:fs';
import path from 'node:path';
import { fetchWithProgress } from './fetch-with-progress.js';

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

  /**
   * Initializes the display of previews in the terminal.
   */
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
      ['STATE'.padEnd(22, ' ')],
    ];

    this.#table = new TerminalTable(columns, rows);
    this.#table.renderInit();
  }

  async updatePreviews () {
    await fs.promises.mkdir('.preview-binaries', { recursive: true });
    await Promise.all(this.#previewNames.map((previewName, index) => {
      const remotePreview = this.#remoteManifest.previews.find((p) => p.name === previewName);
      const localPreview = this.#localManifest.previews.find((p) => p.name === previewName);

      /** @type {string|null} */
      const remoteChecksum = remotePreview?.urls.find((u) => u.os === this.#os)?.checksum.value;
      /** @type {string|null} */
      const localChecksum = localPreview?.urls.find((u) => u.os === this.#os)?.checksum.value;

      if (remoteChecksum != null && localChecksum != null) {
        if (remoteChecksum === localChecksum) {
          return this.#keep(index);
        }
        return this.#updatePreview(index);
      }

      if (remoteChecksum != null && localChecksum == null) {
        if (localPreview != null) {
          return this.#updatePreview(index);
        }
        return this.#downloadPreview(index);
      }

      if (remoteChecksum == null && localChecksum != null) {
        return this.#deletePreview(index);
      }

      return this.#updatePreviewState(index, 'Ignored');
    }));
  }

  #keep (index) {
    this.#updatePreviewState(index, 'Up to date!', 'green');
  }

  #updatePreview (index) {
    return this.#downloadPreview(index, 'Updated!');
  }

  async #downloadPreview (index, doneMessage = 'Downloaded!') {
    const previewName = this.#previewNames[index];
    const remotePreview = this.#remoteManifest.previews.find((p) => p.name === previewName);
    const previewUrl = remotePreview?.urls.find((u) => u.os === this.#os);

    if (!previewUrl) {
      return this.#updatePreviewState(index, 'Error: No URL found', 'red');
    }

    const tmpDir = `/tmp/previews-${previewName}`;

    try {
      this.#updatePreviewState(index, 'Downloading .tar.gz…', 'yellow');
      await fs.promises.mkdir(tmpDir, { recursive: true });
      const [downloadBuffer, downloadError] = await fetchWithProgress(previewUrl.url, (message) => {
        return this.#updatePreviewState(index, message, 'yellow');
      })
        .then((result) => [result])
        .catch((err) => [null, err]);
      if (downloadError != null) {
        return this.#updatePreviewState(index, downloadError.message, 'red');
      }

      this.#updatePreviewState(index, 'Extracting .tar.gz…', 'yellow');
      const tarPath = path.join(tmpDir, 'binary.tar.gz');
      await fs.promises.writeFile(tarPath, downloadBuffer);
      await exec(`tar -xzf binary.tar.gz`, { cwd: tmpDir, quiet: true });

      this.#updatePreviewState(index, 'Installing binary…', 'yellow');
      const sourcePath = `${tmpDir}/clever`;
      const destPath = `.preview-binaries/clever--${previewName}`;
      await fs.promises.copyFile(sourcePath, destPath);
      if (this.#os === 'macos') {
        this.#updatePreviewState(index, 'Trusting binary…', 'yellow');
        await exec(`xattr -d com.apple.quarantine ${destPath}`, { quiet: true });
      }

      this.#updatePreviewState(index, 'Cleaning…', 'blue');
      await clearDirectory(tmpDir);

      this.#updatePreviewState(index, doneMessage, 'green');
    }
    catch (error) {
      this.#updatePreviewState(index, `Error: ${error.message}`, 'red');
    }
  }

  async #deletePreview (index) {
    const previewName = this.#previewNames[index];

    try {
      this.#updatePreviewState(index, 'Deleting binary…', 'yellow');
      const binaryPath = `.preview-binaries/clever--${previewName}`;
      await fs.promises.unlink(binaryPath);

      this.#updatePreviewState(index, 'Deleted!', 'green');
    }
    catch (error) {
      if (error.code === 'ENOENT') {
        return this.#updatePreviewState(index, 'Already deleted!', 'green');
      }
      this.#updatePreviewState(index, `Error: ${error.message}`, 'red');
    }
  }

  #updatePreviewState (index, text, style) {
    this.#table.updateData(index, 6, text, style);
  }
}
