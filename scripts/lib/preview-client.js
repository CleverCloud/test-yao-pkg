import { CellarClient } from './cellar-client.js';
import fs from 'node:fs';
import { getCurrentAuthor, getCurrentCommit } from './git.js';
import { BUILD_DIR, getAssetParts, getAssetPath, PREVIEW_DIR } from './paths.js';
import { getEmoji, getSha256, highlight } from './utils.js';
import dedent from 'dedent';

/**
 * @typedef {import('./preview-client.types.js').Manifest} Manifest
 * @typedef {import('./preview-client.types.js').Preview} Preview
 * @typedef {import('./preview-client.types.js').PreviewUrl} PreviewUrl
 */

const MANIFEST_PATH = `${PREVIEW_DIR}/manifest.json`;
const LIST_INDEX_PATH = `${PREVIEW_DIR}/index.html`;

/**
 * A client for managing preview builds in Clever Cloud's storage.
 * Handles uploading, listing, and deleting preview builds with manifest management.
 */
export class PreviewClient {

  /** @type {CellarClient} */
  #cellarClient;

  /**
   * Creates a new PreviewClient instance.
   * @param {Object} config - Configuration object
   * @param {string} config.bucket - The bucket name for Cellar
   * @param {string} config.accessKeyId - AWS access key ID for Cellar
   * @param {string} config.secretAccessKey - AWS secret access key for Cellar
   */
  constructor ({ bucket, accessKeyId, secretAccessKey }) {
    this.#cellarClient = new CellarClient({
      bucket,
      accessKeyId,
      secretAccessKey,
    });
  }

  /**
   * Retrieves the preview manifest from storage.
   * Returns a default manifest if none exists.
   * @returns {Promise<Manifest>}
   * @throws {Error} When there's an error other than missing manifest
   */
  async getManifest () {
    try {
      const manifestJson = await this.#cellarClient.getObject(MANIFEST_PATH);
      /** @type {Manifest} */
      const manifest = JSON.parse(manifestJson);
      return manifest;
    }
    catch (e) {
      if (e.code === 'NoSuchKey') {
        return {
          version: '1',
          previews: [],
        };
      }
      throw e;
    }
  }

  /**
   * Updates the preview manifest in storage.
   * @param {Manifest} manifest - The manifest object to store
   * @throws {Error} When the update fails
   */
  async updateManifest (manifest) {
    const manifestJson = JSON.stringify(manifest, null, '  ');
    return this.#cellarClient.putObject(manifestJson, MANIFEST_PATH);
  }

  /**
   * Updates the HTML index page that lists all previews.
   * Generates a formatted HTML table with preview information.
   * @param {Manifest} manifest - The manifest containing preview data
   * @private
   */
  async #updateListIndex (manifest) {
    const indexHtml = this.#renderListIndex(manifest);
    return this.#cellarClient.putObject(indexHtml, LIST_INDEX_PATH);
  }

  /**
   * Renders the HTML index page for listing previews.
   * @param {Manifest} manifest
   * @return {string}
   */
  #renderListIndex (manifest) {
    // language=HTML
    return dedent`
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" href="data:image/x-icon;base64,AA">
        <title>Clever tools - Previews</title>
        <style>
        body {
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
          max-width: 60em;
          background-color: #f6f8fa;
          padding: 1em;
        }

        h1 {
          color: #1f2328;
          font-size: 1.5em;
          font-weight: bold;
          margin-bottom: 1em;
        }

        a {
          color: #0969da;
          text-decoration: none;
          font-weight: 500;
        }

        a:hover {
          text-decoration: underline;
        }

        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background-color: #ffffff;
          border: 1px solid #d1d9e0;
          border-radius: 0.375em;
          overflow: hidden;
        }

        tr:hover {
          background-color: #f6f8fa;
        }

        thead tr,
        tbody tr:first-child {
          background-color: #f6f8fa;
        }

        th,
        td {
          font-size: 0.8em;
          border-bottom: 1px solid #d1d9e0;
          padding-inline: 1em;
        }

        th:first-child,
        td:first-child {
          text-align: right;
        }

        th {
          text-align: left;
          font-weight: bold;
          color: #656d76;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background-color: #f6f8fa;
          padding-block: 0.75em;
        }

        td {
          padding-block: 0.5em;
          color: #1f2328;
        }

        tr:last-child td {
          border-bottom: none;
        }

        cc-datetime-relative {
          color: #656d76;
          font-size: 0.875em;
        }

        code {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
          font-size: 0.9em;
          background-color: #f6f8fa;
          padding: 0.125em 0.375em;
          border-radius: 0.375em;
          color: #1f2328;
          border: 1px solid #d1d9e0;
        }

        code.commit {
          color: #0969da;
        }

        /* Dirty alignment hack */
        code.commit,
        code.branch {
          position: relative;
          top: -0.1875em;
        }

        .binaries {
          display: flex;
          flex-wrap: wrap;
          gap: 0.625em;
          /* Dirty alignment hack */
          position: relative;
          left: -0.1875em;
        }

        .empty-message {
          background-color: #ffffff;
          border: 1px solid #333;
          border-radius: 0.375em;
          padding: 2em;
          text-align: center;
          color: #656d76;
          font-style: italic;
          font-size: 0.875em;
        }
        </style>
        <script src="https://components.clever-cloud.com/load.js?components=cc-datetime-relative" type="module"></script>
      </head>
      <body>
      <h1>Clever tools - Previews</h1>
      ${this.#renderManifest(manifest)}
      </body>
      </html>
    `;
  }

  /**
   * Renders the HTML table for the manifest previews.
   * @param {Manifest} manifest
   * @return {string}
   */
  #renderManifest (manifest) {

    if (manifest.previews.length === 0) {
      return `<div class="empty-message">No previews right now</div>`;
    }

    return dedent`
      <table>
        <tr>
          <th>Branch</th>
          <th>Commit ID</th>
          <th>Updated</th>
          <th>Author</th>
          <th>Binaries</th>
        </tr>
        ${manifest.previews.map((p) => this.#renderPreview(p)).join('\n')}
      </table>
    `;
  }

  /**
   * Renders a single preview row in the HTML index.
   * @param {Preview} preview
   * @return {string}
   */
  #renderPreview (preview) {
    return dedent`
      <tr>
        <td><code class="branch"><a href="https://github.com/CleverCloud/clever-tools/tree/${preview.name}">${preview.name}</a></code></td>
        <td><code class="commit" title="${preview.commitId}"><a href="https://github.com/CleverCloud/clever-tools/commit/${preview.commitId}">${preview.commitId.substring(0, 8)}</a></code></td>
        <td><cc-datetime-relative datetime="${preview.updatedAt}">${preview.updatedAt}</cc-datetime-relative></td>
        <td><span>${preview.author}</span></td>
        <td>
          <div class="binaries">
            ${preview.urls.map((u) => this.#renderPreviewUrl(u)).join('')}
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Renders a single preview URL in the HTML index.
   * @param {PreviewUrl} previewUrl
   * @return {string}
   */
  #renderPreviewUrl (previewUrl) {
    return dedent`
      <span title="${previewUrl.checksum.value}">
        ${getEmoji(previewUrl.os)}&nbsp;<a href="${previewUrl.url}">${previewUrl.os}</a>
      </span>
    `;
  }

  /**
   * Lists all available previews.
   * @returns {Promise<Array<Preview>>}
   */
  async listPreviews () {
    const manifest = await this.getManifest();
    return manifest.previews;
  }

  /**
   * Gets a specific preview by name.
   * @param {string} previewName - The name of the preview to retrieve
   * @returns {Promise<Preview|null>} The preview object or undefined if not found
   */
  async getPreview (previewName) {
    const previews = await this.listPreviews();
    const preview = previews.find((p) => p.name === previewName);
    return preview;
  }

  /**
   * Publishes a preview build to storage.
   * Uploads archive files, updates manifest, and regenerates the index page.
   * @param {string} previewName - The name/version of the preview to publish
   * @throws {Error} When upload or manifest update fails
   */
  async publishPreview (previewName) {

    const osList = fs.readdirSync(`${BUILD_DIR}/${previewName}`, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    const archiveDetails = {};

    for (const os of osList) {
      const localPath = getAssetPath('archive', previewName, 'build', os);
      const remotePath = getAssetPath('archive', previewName, 'preview', os);
      console.log(highlight`=> Upload ${localPath} to ${remotePath}`);
      await this.#cellarClient.upload(localPath, remotePath);
      archiveDetails[os] = {
        os,
        url: this.#cellarClient.url(remotePath),
        checksum: {
          type: 'sha256',
          value: getSha256(localPath),
        },
      };
    }

    const manifest = await this.getManifest();

    /** @type {Preview} */
    const newPreview = {
      name: previewName,
      urls: osList.map((os) => archiveDetails[os]),
      updatedAt: new Date().toISOString(),
      commitId: await getCurrentCommit(),
      author: await getCurrentAuthor(),
    };

    const previewIndex = manifest.previews.findIndex((p) => p.name === previewName);
    if (previewIndex !== -1) {
      manifest.previews[previewIndex] = newPreview;
    }
    else {
      manifest.previews.push(newPreview);
    }

    console.log(highlight`=> Update JSON manifest to ${MANIFEST_PATH}`);
    await this.updateManifest(manifest);
    console.log(highlight`=> Update HTML list index to ${LIST_INDEX_PATH}`);
    await this.#updateListIndex(manifest);
  }

  /**
   * Deletes a preview and all its associated files.
   * Removes files from storage, updates manifest, and regenerates the index page.
   * @param {string} previewName - The name of the preview to delete
   * @throws {Error} When the preview doesn't exist or deletion fails
   */
  async deletePreview (previewName) {

    const manifest = await this.getManifest();
    const preview = manifest.previews.find((p) => p.name === previewName);
    if (preview == null) {
      throw new Error(`Preview "${previewName}" does not exist!`);
    }

    const previewDirectory = getAssetParts('archive', previewName, 'preview').directory;
    console.log(highlight`=> Delete ${previewDirectory + '/**'}`);
    await this.#cellarClient.delete(previewDirectory);

    manifest.previews = manifest.previews.filter((p) => p.name !== previewName);

    console.log(highlight`=> Update JSON manifest to ${MANIFEST_PATH}`);
    await this.updateManifest(manifest);
    console.log(highlight`=> Update HTML list index to ${LIST_INDEX_PATH}`);
    await this.#updateListIndex(manifest);
  }
}
