import { clearDirectory } from './fs.js';
import { getEmoji } from './platform-os.js';
import { exec } from './process.js';
import { createTerminalLink, highlight } from './terminal.js';
import { TerminalTable } from './terminal-table.js';
import fs from 'node:fs';
import path from 'node:path';
import { fetchWithProgress } from './fetch-with-progress.js';
import { styleText } from 'node:util';

/**
 * @typedef {import('./common.types.d.ts').Manifest} Manifest
 * @typedef {import('./common.types.d.ts').Preview} Preview
 * @typedef {import('./common.types.d.ts').PreviewUrl} PreviewUrl
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
  /** @type {Array<[string, string?]>} */
  #columns;

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

      // Calculate state
      const state = this.#calculateState(remotePreview, localPreview);

      return [
        preview.name,
        preview.commitId.substring(0, 8),
        date,
        time,
        preview.author,
        links.join(' '),
        state,
      ];
    });

    this.#columns = [
      ['NAME', 'yellow'],
      ['COMMIT ID', 'blue'],
      ['DATE'],
      ['TIME'],
      ['AUTHOR', 'green'],
      ['DOWNLOAD LINKS', 'blue'],
      ['STATE'.padEnd(22, ' ')],
    ];

    this.#table = new TerminalTable(this.#columns, rows);
    this.#table.renderInit();
  }

  /**
   * Updates all previews by downloading, updating, or deleting them based on manifest differences
   * @param {string} [previewName] - Optional preview name to update only a specific preview
   * @returns {Promise<void>}
   */
  async updatePreviews (previewName) {
    await fs.promises.mkdir('.preview-binaries', { recursive: true });

    const previewsToUpdate = previewName != null
      ? [previewName]
      : this.#previewNames;

    await Promise.all(previewsToUpdate.map((previewName, index) => {
      const remotePreview = this.#remoteManifest.previews.find((p) => p.name === previewName);
      const localPreview = this.#localManifest.previews.find((p) => p.name === previewName);

      /** @type {string|null} */
      const remoteChecksum = remotePreview?.urls.find((u) => u.os === this.#os)?.checksum.value;
      /** @type {string|null} */
      const localChecksum = localPreview?.urls.find((u) => u.os === this.#os)?.checksum.value;

      if (remoteChecksum != null && localChecksum != null) {
        if (remoteChecksum === localChecksum) {
          return this.#keep(remotePreview);
        }
        return this.#updatePreview(remotePreview);
      }

      if (remoteChecksum != null && localChecksum == null) {
        if (localPreview != null) {
          return this.#updatePreview(remotePreview);
        }
        return this.#downloadPreview(remotePreview);
      }

      if (remoteChecksum == null && localChecksum != null) {
        return this.#deletePreview(localPreview);
      }

      return this.#updatePreviewState(remotePreview || localPreview, 'Ignored', 'grey');
    }));

    const binaryDir = path.resolve('.preview-binaries');
    const pathEnv = process.env.PATH || '';
    const pathDirs = pathEnv.split(path.delimiter);

    if (!pathDirs.includes(binaryDir) || true) {
      console.log();
      console.log(highlight`💡 TIP: Add ${binaryDir} to your ${'PATH'} to use preview binaries from anywhere:`);
      console.log(styleText('blue', `   export PATH="${binaryDir}:$PATH"`));
      console.log();
    }
  }

  /**
   * Marks a preview as up to date
   * @param {Preview} preview - The preview to mark as up to date
   */
  #keep (preview) {
    this.#updatePreviewState(preview, 'Up to date');
  }

  /**
   * Updates an existing preview by downloading the new version
   * @param {Preview} preview - The preview to update
   * @returns {Promise<void>}
   */
  #updatePreview (preview) {
    return this.#downloadPreview(preview, 'Updated!');
  }

  /**
   * Downloads and installs a preview binary
   * @param {Preview} preview - The preview to download
   * @param {string} [doneMessage='Downloaded!'] - Message to display when download completes
   * @returns {Promise<void>}
   */
  async #downloadPreview (preview, doneMessage = 'Downloaded!') {
    const previewName = preview.name;
    const previewUrl = preview?.urls.find((u) => u.os === this.#os);

    if (!previewUrl) {
      return this.#updatePreviewState(preview, 'Error: No URL found', 'red');
    }

    const tmpDir = `/tmp/previews-${previewName}`;

    try {
      this.#updatePreviewState(preview, 'Downloading .tar.gz…', 'yellow');
      await fs.promises.mkdir(tmpDir, { recursive: true });
      const [downloadBuffer, downloadError] = await fetchWithProgress(previewUrl.url, (message) => {
        return this.#updatePreviewState(preview, message, 'yellow');
      })
        .then((result) => [result])
        .catch((err) => [null, err]);
      if (downloadError != null) {
        return this.#updatePreviewState(preview, downloadError.message, 'red');
      }

      this.#updatePreviewState(preview, 'Extracting .tar.gz…', 'yellow');
      const tarPath = path.join(tmpDir, 'binary.tar.gz');
      await fs.promises.writeFile(tarPath, downloadBuffer);
      await exec(`tar -xzf binary.tar.gz --strip-components=1`, { cwd: tmpDir, quiet: true });

      this.#updatePreviewState(preview, 'Installing binary…', 'yellow');
      const sourcePath = `${tmpDir}/clever`;
      const destPath = this.#getBinaryPath(previewName);
      await fs.promises.copyFile(sourcePath, destPath);
      if (this.#os === 'macos') {
        this.#updatePreviewState(preview, 'Trusting binary…', 'yellow');
        await exec(`xattr -d com.apple.quarantine ${destPath}`, { quiet: true });
      }

      this.#updatePreviewState(preview, 'Cleaning…', 'blue');
      await clearDirectory(tmpDir);

      this.#updatePreviewState(preview, doneMessage, 'green');
    }
    catch (error) {
      this.#updatePreviewState(preview, `Error: ${error.message}`, 'red');
    }
  }

  /**
   * Deletes a preview binary from the local filesystem
   * @param {Preview} preview - The preview to delete
   * @returns {Promise<void>}
   */
  async #deletePreview (preview) {
    const previewName = preview.name;

    try {
      this.#updatePreviewState(preview, 'Deleting binary…', 'yellow');
      const binaryPath = this.#getBinaryPath(previewName);
      // await fs.promises.unlink(binaryPath);

      this.#updatePreviewState(preview, 'Deleted!', 'green');
    }
    catch (error) {
      if (error.code === 'ENOENT') {
        return this.#updatePreviewState(preview, 'Already deleted!', 'green');
      }
      this.#updatePreviewState(preview, `Error: ${error.message}`, 'red');
    }
  }

  /**
   * Gets the local filesystem path for a preview binary
   * @param {string} previewName - Name of the preview
   * @returns {string} The path to the binary file
   */
  #getBinaryPath (previewName) {
    return `.preview-binaries/clever--${previewName}`;
  }

  /**
   * Updates the display state of a preview in the terminal table
   * @param {Preview} preview - The preview to update
   * @param {string} text - The status text to display
   * @param {string} style - The color/style for the text
   */
  #updatePreviewState (preview, text, style) {
    const previewRowIndex = this.#previewNames.indexOf(preview.name);
    const stateColumnIndex = this.#columns.length - 1;
    this.#table.updateData(previewRowIndex, stateColumnIndex, text, style);
  }

  /**
   * Calculate the state of a preview based on remote and local manifests
   * @param {Preview|undefined} remotePreview
   * @param {Preview|undefined} localPreview
   * @returns {string}
   */
  #calculateState (remotePreview, localPreview) {
    const remoteChecksum = remotePreview?.urls.find((u) => u.os === this.#os)?.checksum.value;
    const localChecksum = localPreview?.urls.find((u) => u.os === this.#os)?.checksum.value;

    if (remoteChecksum != null && localChecksum != null) {
      if (remoteChecksum === localChecksum) {
        return 'Up to date';
      }
      return 'Update available';
    }

    if (remoteChecksum != null && localChecksum == null) {
      return 'Not downloaded';
    }

    if (remoteChecksum == null && localChecksum != null) {
      return 'Local only';
    }

    return 'Unknown';
  }
}
