import { CellarClient } from './cellar-client.js';
import fs from 'node:fs';
import { getCurrentAuthor, getCurrentCommit } from './git.js';
import { BUILD_DIR, getArchiveName, getBuildPath, getPreviewPath, PREVIEW_DIR } from './paths.js';
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
   * @param {string} config.accessKeyId - AWS access key ID for Cellar
   * @param {string} config.secretAccessKey - AWS secret access key for Cellar
   */
  constructor ({ accessKeyId, secretAccessKey }) {
    this.#cellarClient = new CellarClient({
      bucket: '6mt2ilnafne8nzomvlg2',
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
    // language=HTML
    const indexHtml = dedent`
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Clever tools - Previews</title>
        <style>
        body {
          margin: 0 auto;
          font-family: Arial, sans-serif;
          width: 100%;
          max-width: 85em;
        }

        code {
          font-family: "SourceCodePro", "monaco", monospace;
          font-size: 1em;
        }

        table {
          width: 100%;
        }

        th {
          text-align: left;
        }

        th,
        td {
          padding: 0.25em 0;
        }

        .binaries {
          display: grid;
          grid-template-columns: max-content auto;
          column-gap: 0.2em;
          align-items: center;
        }

        .binaries code {
          font-size: 0.8em;
          color: grey;
        }
        </style>
        <script src="https://components.clever-cloud.com/load.js?components=cc-datetime-relative" type="module"></script>
      </head>
      <body>
      <h1>Clever tools - Previews</h1>
      ${manifest.previews.length === 0
          ? `<p><em>No previews right now</em></p>`
          : dedent`
          <table>
            <tr>
              <th>Branch</th>
              <th>Binaries</th>
              <th>Updated</th>
              <th>Commit ID</th>
              <th>Author</th>
            </tr>
            ${manifest.previews.map((p) => dedent`
              <tr>
                <td><code>${p.name}</td>
                <td>
                  <div class="binaries">
                    ${p.urls.map((u) => {
            const url = `<a href="${u.url}">${getEmoji(u.os)} ${u.os}</a>`;
            const checksum = `<code>${u.checksum.value}</code></span>`;
            return `${url}${checksum}`;
          }).join('')}
                  </div>
                </td>
                <td><cc-datetime-relative datetime="${p.updatedAt}">${p.updatedAt}</cc-datetime-relative></td>
                <td><span title="${p.commitId}">${p.commitId.substring(0, 8)}</span></td>
                <td>${p.author}</td>
              </tr>
            `).join('\n')}
          </table>
      `}
      </body>
      </html>
    `;

    return this.#cellarClient.putObject(indexHtml, LIST_INDEX_PATH);
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
      const archiveName = getArchiveName(previewName, os);
      const archiveFilepath = `${getBuildPath(previewName, os)}/${archiveName}`;
      const remoteFilepath = `${getPreviewPath(previewName, os)}/${archiveName}`;
      console.log(highlight`=> Upload ${archiveFilepath} to ${remoteFilepath}`);
      await this.#cellarClient.upload(archiveFilepath, remoteFilepath);
      archiveDetails[os] = {
        os,
        url: this.#cellarClient.url(remoteFilepath),
        checksum: {
          type: 'sha256',
          value: getSha256(archiveFilepath),
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

    const previewPath = getPreviewPath(previewName);
    console.log(highlight`=> Delete ${previewPath + '/**'}`);
    await this.#cellarClient.delete(previewPath);

    manifest.previews = manifest.previews.filter((p) => p.name !== previewName);

    console.log(highlight`=> Update JSON manifest to ${MANIFEST_PATH}`);
    await this.updateManifest(manifest);
    console.log(highlight`=> Update HTML list index to ${LIST_INDEX_PATH}`);
    await this.#updateListIndex(manifest);
  }
}
