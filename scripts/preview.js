#!/usr/bin/env node

import { styleText } from 'node:util';
import textTable from 'text-table';
import stringLength from 'string-length';
import {
  clearDirectory,
  createTerminalLink,
  getEmoji,
  getOs,
  getVersion,
  highlight,
  readEnvVars,
  run,
} from './lib/utils.js';
import { getCurrentBranch } from './lib/git.js';
import { PreviewClient } from './lib/preview-client.js';
import { bundleToSingleCjs } from './lib/bundle-cjs.js';
import { buildBinary } from './lib/build-binary.js';
import { createArchive } from './lib/create-archive.js';
import dedent from 'dedent';
import { BUILD_DIR } from './lib/paths.js';
import fs from 'node:fs';

run(async () => {

  const [bucket, accessKeyId, secretAccessKey] = readEnvVars(['CC_CLEVER_TOOLS_PREVIEWS_CELLAR_BUCKET','CC_CLEVER_TOOLS_PREVIEWS_CELLAR_KEY_ID', 'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_SECRET_KEY']);

  const previewClient = new PreviewClient({
    bucket,
    accessKeyId,
    secretAccessKey,
  });

  const [command, rawPreviewName] = process.argv.slice(2);
  if (command == null || command.length === 0) {
    throw new Error(getUsage(`Missing command`));
  }

  const previewName = getVersion(rawPreviewName ?? (await getCurrentBranch()));
  const os = getOs();

  switch (command) {
    case 'list':
      return listPreviews(previewClient);
    case 'update':
      return updatePreviews(previewClient);
    case 'build':
      return buildPreview(previewClient, previewName, os);
    case 'pr-comment':
      return getPreviewPrComment(previewClient, previewName);
    case 'publish':
      return publishPreview(previewClient, previewName, os);
    case 'delete':
      return deletePreview(previewClient, previewName);
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
 * @param {PreviewClient} previewClient - The client instance for preview operations
 */
async function listPreviews (previewClient) {
  const previews = await previewClient.listPreviews();

  if (previews.length === 0) {
    console.log('No previews right now.');
    return;
  }

  displayPreviews(previews);
}

function displayPreviews (previews) {
  const table = previews.map((p) => {
    const date = p.updatedAt.substring(0, 10);
    const dateObject = new Date(p.updatedAt);
    const time = dateObject.toLocaleTimeString();
    const links = p.urls.map((u) => {
      return `${getEmoji(u.os)} ${createTerminalLink(u.url, u.os)}`;
    });
    return [
      styleText('yellow', p.name),
      styleText('blue', p.commitId.substring(0, 8)),
      date,
      time,
      styleText('green', p.author),
      ...links,
    ];
  });

  console.log(textTable(table, { stringLength }));
}

/**

 * @param {PreviewClient} previewClient - The client instance for preview operations
 */
async function updatePreviews (previewClient) {
  const os = getOs();
  
  // Get list of remote previews
  const remotePreviews = await previewClient.listPreviews();
  
  // Get list of local previews
  const localPreviews = await getLocalPreviews();
  
  // Filter previews for current platform only
  const remoteForOs = remotePreviews.map(preview => ({
    ...preview,
    urls: preview.urls.filter(url => url.os === os)
  })).filter(preview => preview.urls.length > 0);
  
  const localForOs = localPreviews.map(preview => ({
    ...preview,
    urls: preview.urls.filter(url => url.os === os)
  })).filter(preview => preview.urls.length > 0);
  
  // Combine and categorize previews
  const previewStatuses = categorizePreviews(remoteForOs, localForOs);
  
  // Display results
  displayPreviewStatuses(previewStatuses);
  
  // Update local manifest
  await updateLocalManifest(remotePreviews);
}

/**
 * Reads local preview manifest from .preview-binaries/manifest.json
 * @returns {Promise<Array>} Array of local previews, empty if file doesn't exist
 */
async function getLocalPreviews() {
  const localManifestPath = '.preview-binaries/manifest.json';
  try {
    const manifestJson = await fs.promises.readFile(localManifestPath, 'utf8');
    const manifest = JSON.parse(manifestJson);
    return manifest.previews || [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Categorizes previews by comparing remote and local versions
 * @param {Array} remotePreviews - Remote previews filtered for current OS
 * @param {Array} localPreviews - Local previews filtered for current OS
 * @returns {Array} Array of objects with name and status
 */
function categorizePreviews(remotePreviews, localPreviews) {
  const remoteMap = new Map(remotePreviews.map(p => [p.name, p]));
  const localMap = new Map(localPreviews.map(p => [p.name, p]));
  const allNames = new Set([...remoteMap.keys(), ...localMap.keys()]);
  
  const results = [];
  
  for (const name of allNames) {
    const remote = remoteMap.get(name);
    const local = localMap.get(name);
    
    let status;
    if (remote && local) {
      // Both exist - check if different (compare checksums)
      const remoteChecksum = remote.urls[0]?.checksum?.value;
      const localChecksum = local.urls[0]?.checksum?.value;
      status = remoteChecksum === localChecksum ? 'up-to-date' : 'update';
    } else if (remote && !local) {
      status = 'download';
    } else if (!remote && local) {
      status = 'delete';
    }
    
    results.push({ name, status });
  }
  
  return results;
}

/**
 * Displays preview statuses in a simple table
 * @param {Array} previewStatuses - Array of objects with name and status
 */
function displayPreviewStatuses(previewStatuses) {
  if (previewStatuses.length === 0) {
    console.log('No previews to display.');
    return;
  }
  
  const table = previewStatuses.map(p => [p.name, p.status]);
  console.log(textTable(table, { stringLength }));
}

/**
 * Updates the local manifest file with remote manifest data
 * @param {Array} remotePreviews - Complete remote preview list
 */
async function updateLocalManifest(remotePreviews) {
  const localManifestPath = '.preview-binaries/manifest.json';
  const localManifestDir = '.preview-binaries';
  
  // Create directory if it doesn't exist
  try {
    await fs.promises.mkdir(localManifestDir, { recursive: true });
  } catch (error) {
    // Ignore error if directory already exists
  }
  
  const manifest = {
    version: '1',
    previews: remotePreviews
  };
  
  const manifestJson = JSON.stringify(manifest, null, 2);
  await fs.promises.writeFile(localManifestPath, manifestJson, 'utf8');
}

/**
 * Generates a markdown comment for GitHub PR with preview download links.
 * @param {PreviewClient} previewClient - The client instance for preview operations
 * @param {string} previewName - The name/version of the preview to get comment for
 * @throws {Error} When no preview is found for the given name
 */
async function getPreviewPrComment (previewClient, previewName) {
  const preview = await previewClient.getPreview(previewName);

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
 * @param {PreviewClient} previewClient - The client instance for preview operations
 * @param {string} previewName - The name/version of the preview to build
 * @param {string} os - The target operating system for the build
 */
async function buildPreview (previewClient, previewName, os) {
  const workingDirectory = `${BUILD_DIR}/${previewName}`;

  console.log(highlight`=> Clear ${workingDirectory}`);
  await clearDirectory(workingDirectory);

  await bundleToSingleCjs(previewName, os);
  await buildBinary(previewName, os);
  await createArchive(previewName, os);
}

/**
 * Publishes a built preview to the preview storage.
 * @param {PreviewClient} previewClient - The client instance for preview operations
 * @param {string} previewName - The name/version of the preview to publish
 */
async function publishPreview (previewClient, previewName) {
  await previewClient.publishPreview(previewName);
}

/**
 * Deletes a preview from the preview storage.
 * @param {PreviewClient} previewClient - The client instance for preview operations
 * @param {string} previewName - The name/version of the preview to delete
 */
async function deletePreview (previewClient, previewName) {
  await previewClient.deletePreview(previewName);
}
