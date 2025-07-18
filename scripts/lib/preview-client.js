import { styleText } from 'node:util';
import { OS_EMOJIS } from './config.js';
import { CellarClient } from './cellar-client.js';
import fs from 'node:fs';
import { getSha256 } from './sha256-lib.js';
import { getCurrentAuthor, getCurrentCommit } from './git.js';

export class PreviewClient {

  #cellarClient;

  constructor ({ accessKeyId, secretAccessKey }) {
    this.#cellarClient = new CellarClient({
      bucket: '6mt2ilnafne8nzomvlg2',
      accessKeyId,
      secretAccessKey,
    });
  }

  async getManifest () {
    try {
      return await this.#cellarClient.getObject(`previews/manifest.json`);
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

  async updateManifest (manifest) {
    const manifestJson = JSON.stringify(manifest, null, '  ');
    return this.#cellarClient.putObject(manifestJson, `previews/manifest.json`);
  }

  async #updateListIndex (manifest) {
    const indexHtml = `
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
      ? `
      <p><em>No previews right now</em></p>
    `
      : `
      <table>
        <tr>
          <th>Branch</th>
          <th>Binaries</th>
          <th>Updated</th>
          <th>Commit ID</th>
          <th>Author</th>
        </tr>
        ${manifest.previews.map((p) => `
          <tr>
            <td><code>${p.name}</td>
            <td>
              <div class="binaries">
                ${p.urls.map((u) => {
        const url = `<a href="${u.url}">${OS_EMOJIS[u.os]} ${u.os}</a>`;
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
    return this.#cellarClient.putObject(indexHtml, `previews/index.html`);
  }

  async listPreviews () {
    const manifest = await this.getManifest();
    return manifest.previews;
  }

  async getPreview (previewName) {
    const previews = await this.listPreviews();
    const preview = previews.find((p) => p.name === previewName);
    return preview;
  }

  async publishPreview (previewName, os) {

    // TODO
    const osList = fs.readdirSync('build/' + previewName).filter((f) => ['linux', 'macos', 'win'].includes(f));

    const archiveDetails = {};

    for (const os of osList) {
      const filename = os === 'win'
        ? `clever-tools-${previewName}_${os}.zip`
        : `clever-tools-${previewName}_${os}.tar.gz`;
      const archiveFilepath = `build/${previewName}/${os}/${filename}`;
      const remoteFilepath = `previews/${previewName}/${os}/${filename}`;
      console.log(`=> Upload ${styleText('yellow', archiveFilepath)} to ${styleText('yellow', remoteFilepath)}`);
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

    const newPreview = {
      name: previewName,
      urls: osList.map((os) => archiveDetails[os]),
      updatedAt: new Date().toISOString(),
      commitId: getCurrentCommit(),
      author: getCurrentAuthor(),
    };

    const previewIndex = manifest.previews.findIndex((p) => p.name === previewName);
    if (previewIndex !== -1) {
      manifest.previews[previewIndex] = newPreview;
    }
    else {
      manifest.previews.push(newPreview);
    }

    console.log(`=> Update JSON manifest to ${styleText('yellow', 'previews/manifest.json')}`);
    await this.updateManifest(manifest);
    console.log(`=> Update HTML list index to ${styleText('yellow', 'previews/index.html')}`);
    await this.#updateListIndex(manifest);
  }

  async deletePreview (previewName) {

    const manifest = await this.getManifest();
    const preview = manifest.previews.find((p) => p.name === previewName);
    if (preview == null) {
      throw new Error(`Preview "${previewName}" does not exist!`);
    }

    const foo = `previews/${previewName}`;
    console.log(`=> Delete ${styleText('yellow', foo + '/**')}`);
    await this.#cellarClient.delete(foo);

    manifest.previews = manifest.previews.filter((p) => p.name !== previewName);

    console.log(`=> Update JSON manifest to ${styleText('yellow', 'previews/manifest.json')}`);
    await this.updateManifest(manifest);
    console.log(`=> Update HTML list index to ${styleText('yellow', 'previews/index.html')}`);
    await this.#updateListIndex(manifest);
  }
}
