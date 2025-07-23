import { clearDirectory, createTerminalLink, exec, getEmoji } from './utils.js';
import { TerminalTable } from './terminal-table.js';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';

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

    await setTimeout(1000);
  }

  #updatePreviewState (index, text, style) {
    this.#table.updateData(index, 6, text, style);
  }

  #keep (index) {
    this.#updatePreviewState(index, 'OK!');
  }

  #updatePreview (index) {
    this.#updatePreviewState(index, 'Updating…');
    setTimeout(() => {
      this.#updatePreviewState(index, 'Updated!');
    }, 5000);
  }

  async #downloadPreview (index) {
    const previewName = this.#previewNames[index];
    const remotePreview = this.#remoteManifest.previews.find((p) => p.name === previewName);
    const previewUrl = remotePreview?.urls.find((u) => u.os === this.#os);

    if (!previewUrl) {
      return this.#updatePreviewState(index, 'Error: No URL found', 'red');
    }

    try {
      this.#updatePreviewState(index, 'Downloading .tar.gz…', 'yellow');
      const tmpDir = `/tmp/previews-${previewName}`;
      await fs.promises.mkdir(tmpDir, { recursive: true });
      const response = await fetch(previewUrl.url);
      if (!response.ok) {
        return this.#updatePreviewState(index, `Download failed: ${response.statusText}`, 'red');
      }

      // TODO replace with simple template tag and /
      this.#updatePreviewState(index, 'Extracting .tar.gz…', 'yellow');
      const tarPath = path.join(tmpDir, 'binary.tar.gz');
      const arrayBuffer = await response.arrayBuffer();
      await fs.promises.writeFile(tarPath, Buffer.from(arrayBuffer));
      // TODO pass a quiet: true boolean to the options so the exec does not log
      await exec(`tar -xzf binary.tar.gz`, { cwd: tmpDir });

      this.#updatePreviewState(index, 'Installing binary…', 'yellow');
      const extractedFiles = await fs.promises.readdir(tmpDir);
      const binaryFile = extractedFiles.find(file => file !== 'binary.tar.gz' && !file.endsWith('.tar.gz'));

      if (binaryFile != null) {
        // TODO replace with simple template tag and /
        const sourcePath = path.join(tmpDir, binaryFile);
        const destPath = `.preview-binaries/clever--${previewName}`;
        await fs.promises.copyFile(sourcePath, destPath);
        await fs.promises.chmod(destPath, 0o755);
      }

      this.#updatePreviewState(index, 'Cleaning…', 'blue');
      await clearDirectory(tmpDir);

      this.#updatePreviewState(index, 'OK!', 'green');
    }
    catch (error) {
      this.#updatePreviewState(index, `Error: ${error.message}`, 'red');
    }
  }

  async #deletePreview (index) {
    const previewName = this.#previewNames[index];

    try {
      this.#updatePreviewState(index, 'Deleting binary…');

      const binaryPath = `.preview-binaries/clever--${previewName}`;
      await fs.promises.unlink(binaryPath);

      this.#updatePreviewState(index, 'Deleted!');
    }
    catch (error) {
      if (error.code === 'ENOENT') {
        this.#updatePreviewState(index, 'Already deleted');
      }
      else {
        this.#updatePreviewState(index, `Error: ${error.message}`);
      }
    }
  }
}
