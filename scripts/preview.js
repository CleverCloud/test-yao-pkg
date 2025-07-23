#!/usr/bin/env node

import { clearDirectory, getEmoji, getOs, getVersion, highlight, readEnvVars, run, formatBranchName, getSha256 } from './lib/utils.js';
import { getCurrentBranch, getCurrentAuthor, getCurrentCommit } from './lib/git.js';
import { CellarClient } from './lib/cellar-client.js';
import { bundleToSingleCjs } from './lib/bundle-cjs.js';
import { buildBinary } from './lib/build-binary.js';
import { createArchive } from './lib/create-archive.js';
import dedent from 'dedent';
import { BUILD_DIR, getAssetParts, getAssetPath, PREVIEW_DIR } from './lib/paths.js';
import { PreviewDisplay } from './lib/preview-display.js';
import fs from 'node:fs';

/**
 * @typedef {import('./lib/preview-client.types.js').Manifest} Manifest
 * @typedef {import('./lib/preview-client.types.js').Preview} Preview
 * @typedef {import('./lib/preview-client.types.js').PreviewUrl} PreviewUrl
 */

const MANIFEST_URL = 'https://6mt2ilnafne8nzomvlg2.cellar-c2.services.clever-cloud.com/previews/manifest.json';
const MANIFEST_PATH = `${PREVIEW_DIR}/manifest.json`;
const LIST_INDEX_PATH = `${PREVIEW_DIR}/index.html`;

run(async () => {

  const [command, rawPreviewName] = process.argv.slice(2);
  if (command == null || command.length === 0) {
    throw new Error(getUsage(`Missing command`));
  }

  const previewName = getVersion(rawPreviewName ?? (await getCurrentBranch()));
  const os = getOs();

  switch (command) {
    case 'list':
      return listPreviews();
    case 'build':
      return buildPreview(previewName, os);
    case 'pr-comment':
      return getPreviewPrComment(previewName);
    case 'publish':
      return publishPreview(previewName);
    case 'delete':
      return deletePreview(previewName);
  }

  throw new Error(getUsage(`Unknown command "${command}"`));
});

/**
 * Generates a usage message for the CLI tool.
 * @param {string} message
 * @return {string}
 */
function getUsage (message) {
  return dedent`
    ${message}

    USAGE
      preview.js list
      preview.js update
      preview.js pr-comment [preview-name]
      preview.js build [preview-name]
      preview.js publish [preview-name]
      preview.js delete [preview-name]
  `;
}

/**
 * Lists all available previews in a formatted table.
 * Displays preview information including date, commit ID, name, author, and download links.
 */
async function listPreviews () {
  const manifest = await getManifest();
  const previews = manifest.previews;

  if (previews.length === 0) {
    console.log('No previews right now.');
    return;
  }

  PreviewDisplay.displayPreviews(previews);
}

/**
 * Generates a markdown comment for GitHub PR with preview download links.
 * @param {string} previewName - The name/version of the preview to get comment for
 * @throws {Error} When no preview is found for the given name
 */
async function getPreviewPrComment (previewName) {
  const manifest = await getManifest();
  const preview = manifest.previews.find((p) => p.name === previewName);
  if (preview == null) {
    throw new Error(highlight`No preview for ${previewName} could be found`);
  }

  const links = preview.urls
    .map((u) => {
      const name = `${getEmoji(u.os)}`;
      const link = `[${u.os}](${u.url})`;
      const checksum = `\`${u.checksum.value}\``;
      return `| ${name} ${link} | ${checksum} |`;
    })
    .join('\n');

  console.log(dedent`
    🔎 A preview has been automatically published:
  
    | OS | SHA256 checkum |
    |-|-|
    ${links}
  
    _This preview will be deleted once this PR is closed._
  `);
}

/**
 * Builds a preview by bundling to single CJS, compiling binary, and creating an archive.
 * Clears the working directory before starting the build process.
 * @param {string} previewName - The name/version of the preview to build
 * @param {string} os - The target operating system for the build
 */
async function buildPreview (previewName, os) {
  const workingDirectory = `${BUILD_DIR}/${previewName}`;

  console.log(highlight`=> Clear ${workingDirectory}`);
  await clearDirectory(workingDirectory);

  await bundleToSingleCjs(previewName, os);
  await buildBinary(previewName, os);
  await createArchive(previewName, os);
}

/**
 * Publishes a built preview to the preview storage.
 * @param {string} previewName - The name/version of the preview to publish
 */
async function publishPreview (previewName) {
  const [bucket, accessKeyId, secretAccessKey] = readEnvVars([
    'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_BUCKET',
    'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_KEY_ID',
    'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_SECRET_KEY',
  ]);
  const cellarClient = new CellarClient({
    bucket,
    accessKeyId,
    secretAccessKey,
  });

  const osList = fs.readdirSync(`${BUILD_DIR}/${previewName}`, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const archiveDetails = {};

  for (const os of osList) {
    const localPath = getAssetPath('archive', previewName, 'build', os);
    const remotePath = getAssetPath('archive', previewName, 'preview', os);
    console.log(highlight`=> Upload ${localPath} to ${remotePath}`);
    await cellarClient.upload(localPath, remotePath);
    archiveDetails[os] = {
      os,
      url: cellarClient.url(remotePath),
      checksum: {
        type: 'sha256',
        value: getSha256(localPath),
      },
    };
  }

  const manifest = await getManifest();

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
  await updateManifest(cellarClient, manifest);
  console.log(highlight`=> Update HTML list index to ${LIST_INDEX_PATH}`);
  await updateListIndex(cellarClient, manifest);
}

/**
 * Deletes a preview from the preview storage.
 * @param {string} previewName - The name/version of the preview to delete
 */
async function deletePreview (previewName) {
  const [bucket, accessKeyId, secretAccessKey] = readEnvVars([
    'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_BUCKET',
    'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_KEY_ID',
     'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_SECRET_KEY',
  ]);
  const cellarClient = new CellarClient({
    bucket,
    accessKeyId,
    secretAccessKey,
  });

  const manifest = await getManifest();
  const preview = manifest.previews.find((p) => p.name === previewName);
  if (preview == null) {
    throw new Error(`Preview "${previewName}" does not exist!`);
  }

  const previewDirectory = getAssetParts('archive', previewName, 'preview').directory;
  console.log(highlight`=> Delete ${previewDirectory + '/**'}`);
  await cellarClient.delete(previewDirectory);

  manifest.previews = manifest.previews.filter((p) => p.name !== previewName);

  console.log(highlight`=> Update JSON manifest to ${MANIFEST_PATH}`);
  await updateManifest(cellarClient, manifest);
  console.log(highlight`=> Update HTML list index to ${LIST_INDEX_PATH}`);
  await updateListIndex(cellarClient, manifest);
}

/**
 * Retrieves the preview manifest from storage.
 * Returns a default manifest if none exists.
 * @returns {Promise<Manifest>}
 * @throws {Error} When there's an error other than missing manifest
 */
async function getManifest () {
  try {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok) {
      if (response.status === 404) {
        return {
          version: '1',
          previews: [],
        };
      }
      throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
    }
    const manifestJson = await response.text();
    /** @type {Manifest} */
    const manifest = JSON.parse(manifestJson);
    return manifest;
  }
  catch (e) {
    if (e instanceof TypeError) {
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
 * @param {CellarClient} cellarClient - The cellar client instance
 * @param {Manifest} manifest - The manifest object to store
 * @throws {Error} When the update fails
 */
async function updateManifest (cellarClient, manifest) {
  const manifestJson = JSON.stringify(manifest, null, '  ');
  return cellarClient.putObject(manifestJson, MANIFEST_PATH);
}

/**
 * Updates the HTML index page that lists all previews.
 * Generates a formatted HTML table with preview information.
 * @param {CellarClient} cellarClient - The cellar client instance
 * @param {Manifest} manifest - The manifest containing preview data
 */
async function updateListIndex (cellarClient, manifest) {
  const indexHtml = renderListIndex(manifest);
  return cellarClient.putObject(indexHtml, LIST_INDEX_PATH);
}

/**
 * Renders the HTML index page for listing previews.
 * @param {Manifest} manifest
 * @return {string}
 */
function renderListIndex (manifest) {
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
        max-width: 65em;
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
        font-size: 0.9em;
        border-bottom: 1px solid #d1d9e0;
        padding-inline: 1em;
      }

      th.right,
      td.right {
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
        font-size: 0.9em;
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
    ${renderManifest(manifest)}
    </body>
    </html>
  `;
}

/**
 * Renders the HTML table for the manifest previews.
 * @param {Manifest} manifest
 * @return {string}
 */
function renderManifest (manifest) {

  if (manifest.previews.length === 0) {
    return `<div class="empty-message">No previews right now</div>`;
  }

  return dedent`
    <table>
      <tr>
        <th>Branch</th>
        <th>Commit ID</th>
        <th class="right">Updated</th>
        <th>Author</th>
        <th>Binaries</th>
      </tr>
      ${manifest.previews.map((p) => renderPreview(p)).join('\n')}
    </table>
  `;
}

/**
 * Renders a single preview row in the HTML index.
 * @param {Preview} preview
 * @return {string}
 */
function renderPreview (preview) {
  return dedent`
    <tr>
      <td><code class="branch"><a href="https://github.com/CleverCloud/clever-tools/tree/${preview.name}">${formatBranchName(preview.name)}</a></code></td>
      <td><code class="commit" title="${preview.commitId}"><a href="https://github.com/CleverCloud/clever-tools/commit/${preview.commitId}">${preview.commitId.substring(0, 8)}</a></code></td>
      <td class="right"><cc-datetime-relative datetime="${preview.updatedAt}">${preview.updatedAt}</cc-datetime-relative></td>
      <td><span>${preview.author}</span></td>
      <td>
        <div class="binaries">
          ${preview.urls.map((u) => renderPreviewUrl(u)).join('')}
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
function renderPreviewUrl (previewUrl) {
  return dedent`
    <span title="${previewUrl.checksum.value}">
      ${getEmoji(previewUrl.os)}&nbsp;<a href="${previewUrl.url}">${previewUrl.os}</a>
    </span>
  `;
}
