#!/usr/bin/env node

import { clearDirectory, getEmoji, getOs, getSha256, getVersion, highlight, readEnvVars, run } from './lib/utils.js';
import { getCurrentAuthor, getCurrentBranch, getCurrentCommit } from './lib/git.js';
import { CellarClient } from './lib/cellar-client.js';
import { bundleToSingleCjs } from './lib/bundle-cjs.js';
import { buildBinary } from './lib/build-binary.js';
import { createArchive } from './lib/create-archive.js';
import dedent from 'dedent';
import { BUILD_DIR, getAssetParts, getAssetPath, PREVIEW_DIR } from './lib/paths.js';
import { TerminalPreviews } from './lib/terminal-previews.js';
import fs from 'node:fs';
import { HtmlPreviews } from './lib/html-previews.js';

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
    case 'update':
      return updatePreviews();
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
      preview.js build [preview-name]
      preview.js pr-comment [preview-name]
      preview.js publish [preview-name]
      preview.js delete [preview-name]
  `;
}

/**
 * Lists all available previews in a formatted table.
 * Displays preview information including date, commit ID, name, author, and download links.
 */
async function listPreviews () {
  const remoteManifest = await fetchManifest();
  const terminalPreviews = new TerminalPreviews(remoteManifest);
  terminalPreviews.initDisplay();
}

/**
 * Updates the local previews (download/update/delete...) and display progress.
 * Displays information including date, commit ID, name, author, and download links.
 */
async function updatePreviews () {
  const remoteManifest = await fetchManifest();
  const localManifest = await getLocalManifest();
  const terminalPreviews = new TerminalPreviews(remoteManifest);
  terminalPreviews.initDisplay();
  // TODO
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
 * Generates a markdown comment for GitHub PR with preview download links.
 * @param {string} previewName - The name/version of the preview to get comment for
 * @throws {Error} When no preview is found for the given name
 */
async function getPreviewPrComment (previewName) {
  const manifest = await fetchManifest();
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
 * Publishes a built preview to the preview storage.
 * @param {string} previewName - The name/version of the preview to publish
 */
async function publishPreview (previewName) {
  const cellarClient = createCellarClient();

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

  const manifest = await fetchManifest();

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
  const cellarClient = createCellarClient();

  const manifest = await fetchManifest();
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
async function fetchManifest () {
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

// TODO implement this
async function getLocalManifest () {
  // local manifest is in ".preview-binaries/manifest.json" (should be a const)
  // if local manifest cannot be found, renturn an empty manifest
  // fetchManifest() already has an empty manifest, we should factorize this
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
  const htmlPreviews = new HtmlPreviews(manifest);
  return cellarClient.putObject(htmlPreviews.render(), LIST_INDEX_PATH);
}

/**
 * Creates and configures a Cellar client instance.
 * @returns {CellarClient} Configured cellar client
 */
function createCellarClient () {
  const [bucket, accessKeyId, secretAccessKey] = readEnvVars([
    'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_BUCKET',
    'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_KEY_ID',
    'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_SECRET_KEY',
  ]);
  return new CellarClient({
    bucket,
    accessKeyId,
    secretAccessKey,
  });
}
