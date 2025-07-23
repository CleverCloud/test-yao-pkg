#!/usr/bin/env node

import { clearDirectory, getEmoji, getOs, getVersion, highlight, readEnvVars, run } from './lib/utils.js';
import { getCurrentBranch } from './lib/git.js';
import { PreviewClient } from './lib/preview-client.js';
import { bundleToSingleCjs } from './lib/bundle-cjs.js';
import { buildBinary } from './lib/build-binary.js';
import { createArchive } from './lib/create-archive.js';
import dedent from 'dedent';
import { BUILD_DIR } from './lib/paths.js';
import { PreviewDisplay } from './lib/preview-display.js';

/**
 * @typedef {import('./preview-client.types.js').Manifest} Manifest
 * @typedef {import('./preview-client.types.js').Preview} Preview
 * @typedef {import('./preview-client.types.js').PreviewUrl} PreviewUrl
 */

run(async () => {

  const [bucket, accessKeyId, secretAccessKey] = readEnvVars(['CC_CLEVER_TOOLS_PREVIEWS_CELLAR_BUCKET', 'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_KEY_ID', 'CC_CLEVER_TOOLS_PREVIEWS_CELLAR_SECRET_KEY']);

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
  const previews = await PreviewClient.listPreviews();

  if (previews.length === 0) {
    console.log('No previews right now.');
    return;
  }

  PreviewDisplay.displayPreviews(previews);
}

/**

 * @param {PreviewClient} previewClient - The client instance for preview operations
 */
async function updatePreviews (previewClient) {
  const os = getOs();
  const remotePreviews = await PreviewClient.listPreviews();
  const localPreviews = await PreviewDisplay.getLocalPreviews();
  const previewDisplay = new PreviewDisplay(remotePreviews, localPreviews, os);
  await previewDisplay.init();
  await previewDisplay.startUpdate();
}

/**
 * Generates a markdown comment for GitHub PR with preview download links.
 * @param {PreviewClient} previewClient - The client instance for preview operations
 * @param {string} previewName - The name/version of the preview to get comment for
 * @throws {Error} When no preview is found for the given name
 */
async function getPreviewPrComment (previewClient, previewName) {
  const preview = await PreviewClient.getPreview(previewName);

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
