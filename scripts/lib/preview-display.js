import { styleText } from 'node:util';
import textTable from 'text-table';
import stringLength from 'string-length';
import fs from 'node:fs';
import path from 'node:path';
import { createTerminalLink, exec, formatBranchName, getEmoji, getOs } from './utils.js';

/**
 * @typedef {import('./preview-client.types.d.ts').Preview} Preview
 */

/**
 * Handles display and management of preview builds
 */
export class PreviewDisplay {
  #remotePreviews;
  #localPreviews;
  #os;
  #previewActions;

  /**
   * @param {Array<Preview>} remotePreviews - Remote preview builds
   * @param {Array<Preview>} localPreviews - Local preview builds
   */
  constructor (remotePreviews, localPreviews, os) {
    this.#remotePreviews = remotePreviews;
    this.#localPreviews = localPreviews;
    this.#os = getOs();
  }

  /**
   * Initialize the display interface and handle preview updates
   */
  async init () {
    this.#previewActions = this.#categorizePreviews(this.#remotePreviews, this.#localPreviews, this.#os);
    this.#displayPreviews(this.#previewActions);
  }

  /**
   * Update the details of a specific preview
   * @param {string} previewName - Name of the preview to update
   * @param {string} details - New details for the preview
   */
  update (previewName, details) {
  }

  async startUpdate () {
    for (const preview of this.#previewActions) {
      const action = preview.action ?? 'unknown';

      switch (action) {
        case 'keep':
          // Do nothing
          break;
        case 'update':
        case 'download':
          this.#downloadAndInstallPreview(preview, this.#os);
          break;
        case 'delete':
          this.#deleteLocalPreview(preview.name);
          break;
        case 'no-preview-for-os':
          console.log(styleText('yellow', `Warning: No ${this.#os} build available for preview ${preview.name}`));
          break;
        case 'ignore':
          // Skip this entry
          break;
        case 'unknown':
          console.error(styleText('red', `Error: Unknown action for preview ${preview.name}`));
          break;
      }
    }

    await this.#updateLocalManifest(this.#remotePreviews);
  }

  /**
   * Displays previews in a table format (static method for general use)
   * @param {Array} previews - Array of previews to display
   */
  static displayPreviews (previews) {
    if (previews.length === 0) {
      console.log('No previews to display.');
      return;
    }

    const table = previews.map((p) => {
      const date = p.updatedAt.substring(0, 10);
      const dateObject = new Date(p.updatedAt);
      const time = dateObject.toLocaleTimeString();
      const links = p.urls.map((u) => {
        return `${getEmoji(u.os)} ${createTerminalLink(u.url, u.os)}`;
      });

      const action = p.action ?? 'unknown';
      const isDeleted = action === 'delete';

      const row = [
        styleText('yellow', formatBranchName(p.name)),
        styleText('blue', p.commitId.substring(0, 8)),
        date,
        time,
        styleText('green', p.author),
        ...links,
        styleText('cyan', action),
      ];

      // Dim the entire row if action is 'delete'
      return isDeleted ? row.map((cell) => styleText('dim', cell)) : row;
    });

    console.log(textTable(table, { stringLength }));
  }

  /**
   * Reads local preview manifest from .preview-binaries/manifest.json
   * @returns {Promise<Array<Preview>>} Array of local previews, empty if file doesn't exist
   */
  static async getLocalPreviews () {
    const localManifestPath = '.preview-binaries/manifest.json';
    try {
      const manifestJson = await fs.promises.readFile(localManifestPath, 'utf8');
      const manifest = JSON.parse(manifestJson);
      return manifest.previews || [];
    }
    catch (error) {
      return [];
    }
  }

  /**
   * Categorizes previews by comparing remote and local versions
   * @param {Array<Preview>} remotePreviews - Remote previews
   * @param {Array<Preview>} localPreviews - Local previews
   * @param {'linux'|'macos'|'win'} os - The operating system to focus on
   * @returns {Array} Array of objects with name, action, and preview data
   */
  #categorizePreviews (remotePreviews, localPreviews, os) {
    /** @type {Map<string, Preview>} */
    const remoteMap = new Map(remotePreviews.map((p) => [p.name, p]));
    /** @type {Map<string, Preview>} */
    const localMap = new Map(localPreviews.map((p) => [p.name, p]));
    const allNames = new Set([...remoteMap.keys(), ...localMap.keys()]);

    const results = [];

    for (const name of allNames) {
      const remote = remoteMap.get(name);
      const local = localMap.get(name);
      const action = this.#getPreviewAction(remote, local, os);
      const preview = remote ?? local;
      results.push({ ...preview, action });
    }

    return results;
  }

  /**
   * Determines the action for a preview for a specific OS
   * @param {Preview|null} remotePreview - Remote preview
   * @param {Preview|null} localPreview - Local preview
   * @param {'linux'|'macos'|'win'} os - The operating system to focus on
   * @return {'keep'|'update'|'download'|'delete'|'no-preview-for-os'|'ignore'}
   */
  #getPreviewAction (remotePreview, localPreview, os) {
    // No remote preview, local exists
    if (remotePreview == null && localPreview != null) {
      return 'delete';
    }

    const remoteUrlForOs = remotePreview?.urls.find((u) => u.os === os);
    const localUrlForOs = localPreview?.urls.find((u) => u.os === os);

    // Remote exists, no local preview
    if (remotePreview != null && localPreview == null) {
      if (remoteUrlForOs != null) {
        return 'download';
      }
      return 'no-preview-for-os';
    }

    // Both previews have the OS build - compare checksums
    if (remoteUrlForOs != null && localUrlForOs != null) {
      const remoteChecksum = remoteUrlForOs.checksum.value;
      const localChecksum = localUrlForOs.checksum.value;
      return remoteChecksum === localChecksum ? 'keep' : 'update';
    }

    // Remote has OS build, local doesn't
    if (remoteUrlForOs != null && localUrlForOs == null) {
      return 'download';
    }

    // Remote no longer has OS build, but local does
    if (remoteUrlForOs == null && localUrlForOs != null) {
      return 'delete';
    }

    // Neither has OS build - skip this entry
    return 'ignore';
  }

  /**
   * Displays previews with actions
   * @param {Array} previewActions - Array of previews + an action field
   */
  #displayPreviews (previewActions) {
    if (previewActions.length === 0) {
      console.log('No previews to display.');
      return;
    }

    const table = previewActions.map((p) => {
      const date = p.updatedAt.substring(0, 10);
      const dateObject = new Date(p.updatedAt);
      const time = dateObject.toLocaleTimeString();
      const links = p.urls.map((u) => {
        return `${getEmoji(u.os)} ${createTerminalLink(u.url, u.os)}`;
      });

      const action = p.action ?? 'unknown';
      const isDeleted = action === 'delete';

      const row = [
        styleText('yellow', formatBranchName(p.name)),
        styleText('blue', p.commitId.substring(0, 8)),
        date,
        time,
        styleText('green', p.author),
        ...links,
        styleText('cyan', action),
      ];

      // Dim the entire row if action is 'delete'
      return isDeleted ? row.map((cell) => styleText('dim', cell)) : row;
    });

    console.log(textTable(table, { stringLength }));
  }

  /**
   * Downloads and installs a preview binary
   * @param {Preview} preview - The preview object containing URL information
   * @param {'linux'|'macos'|'win'} os - The current operating system
   */
  async #downloadAndInstallPreview (preview, os) {
    const previewUrl = preview.urls.find(u => u.os === os);
    if (!previewUrl) {
      console.log(styleText('yellow', `Warning: No ${os} build available for preview ${preview.name}`));
      return;
    }

    const tmpDir = '/tmp';
    const archiveName = `clever-tools-${preview.name}_${os}.tar.gz`;
    const tmpArchivePath = path.join(tmpDir, archiveName);
    const tmpExtractPath = path.join(tmpDir, `clever-extract-${preview.name}`);

    try {
      console.log(styleText('blue', `Downloading ${preview.name} for ${os}...`));

      // Download the archive
      const response = await fetch(previewUrl.url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.promises.writeFile(tmpArchivePath, buffer);

      // Create extraction directory
      await fs.promises.mkdir(tmpExtractPath, { recursive: true });

      // Extract the archive
      console.log(styleText('blue', `Extracting ${archiveName}...`));
      await exec(`tar -xzf "${tmpArchivePath}" -C "${tmpExtractPath}"`);

      // Create .preview-binaries directory if it doesn't exist
      const previewBinariesDir = '.preview-binaries';
      await fs.promises.mkdir(previewBinariesDir, { recursive: true });

      // Find the extracted binary and move it
      const extractedFiles = await fs.promises.readdir(tmpExtractPath);
      const binaryName = os === 'win' ? 'clever.exe' : 'clever';
      const binaryPath = path.join(tmpExtractPath, binaryName);
      const targetBinaryName = `clever--${preview.name}${os === 'win' ? '.exe' : ''}`;
      const targetBinaryPath = path.join(previewBinariesDir, targetBinaryName);

      if (await fs.promises.access(binaryPath).then(() => true).catch(() => false)) {
        await fs.promises.copyFile(binaryPath, targetBinaryPath);
        await fs.promises.chmod(targetBinaryPath, 0o755);
        console.log(styleText('green', `Installed ${preview.name} to ${targetBinaryPath}`));
      }
      else {
        throw new Error(`Binary not found in extracted archive: ${binaryPath}`);
      }

    }
    catch (error) {
      console.error(styleText('red', `Failed to download/install preview ${preview.name}: ${error.message}`));
    } finally {
      // Cleanup temporary files
      try {
        await fs.promises.unlink(tmpArchivePath);
        await fs.promises.rm(tmpExtractPath, { recursive: true, force: true });
      }
      catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Deletes a local preview binary
   * @param {string} previewName - The name of the preview to delete
   */
  async #deleteLocalPreview (previewName) {
    const previewBinariesDir = '.preview-binaries';
    const os = this.#os;
    const binaryExtension = os === 'win' ? '.exe' : '';
    const binaryName = `clever--${previewName}${binaryExtension}`;
    const binaryPath = path.join(previewBinariesDir, binaryName);

    try {
      await fs.promises.unlink(binaryPath);
      console.log(styleText('green', `Deleted local preview binary: ${binaryPath}`));
    }
    catch (error) {
      if (error.code === 'ENOENT') {
        console.log(styleText('yellow', `Local preview binary not found: ${binaryPath}`));
      }
      else {
        console.error(styleText('red', `Failed to delete local preview binary ${binaryPath}: ${error.message}`));
      }
    }
  }

  /**
   * Updates the local manifest file with remote manifest data
   * @param {Array} remotePreviews - Complete remote preview list
   */
  async #updateLocalManifest (remotePreviews) {
    const localManifestPath = '.preview-binaries/manifest.json';
    const localManifestDir = '.preview-binaries';

    // Create directory if it doesn't exist
    try {
      await fs.promises.mkdir(localManifestDir, { recursive: true });
    }
    catch (error) {
      // Ignore error if directory already exists
    }

    const manifest = {
      version: '1',
      previews: remotePreviews,
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    await fs.promises.writeFile(localManifestPath, manifestJson, 'utf8');
  }
}
