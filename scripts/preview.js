#!/usr/bin/env node

import { styleText } from 'node:util';
import textTable from 'text-table';
import stringLength from 'string-length';
import { clearDirectory, createTerminalLink, getEmoji, getOs, getVersion, highlight } from './lib/utils.js';
import { getCurrentBranch } from './lib/git.js';
import { PreviewClient } from './lib/preview-client.js';
import { bundleToSingleCjs } from './lib/bundle-cjs.js';
import { buildBinary } from './lib/build-binary.js';
import { createArchive } from './lib/create-archive.js';
import dedent from 'dedent';

/**
 * Main entry point for the preview management CLI tool.
 * @throws {Error} When required environment variables are missing, when the command is missing or when an unknown command is provided
 * @returns {Promise<void>}
 */
async function run () {

  const accessKeyId = process.env.CC_CLEVER_TOOLS_PREVIEWS_CELLAR_KEY_ID;
  const secretAccessKey = process.env.CC_CLEVER_TOOLS_PREVIEWS_CELLAR_SECRET_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(dedent`
      Could not read Cellar access/secret keys!
      You need the following environment variables:
        - CC_CLEVER_TOOLS_PREVIEWS_CELLAR_KEY_ID
        - CC_CLEVER_TOOLS_PREVIEWS_CELLAR_SECRET_KEY
    `);
  }

  const previewClient = new PreviewClient({
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
}

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

  const table = previews.map((p) => {
    const date = p.updatedAt.substring(0, 10);
    const dateObject = new Date(p.updatedAt);
    const time = dateObject.toLocaleTimeString();
    const links = p.urls.map((u) => {
      return `${getEmoji(u.os)} ${createTerminalLink(u.url, u.os)}`;
    });
    return [
      date,
      time,
      styleText('blue', p.commitId.substring(0, 8)),
      styleText('yellow', p.name),
      styleText('green', p.author),
      ...links,
    ];
  });

  console.log(textTable(table, { stringLength }));
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
  const workingDirectory = `build/${previewName}`;

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
 * @param {string} os - The target operating system for the preview
 */
async function publishPreview (previewClient, previewName, os) {
  await previewClient.publishPreview(previewName, os);
}

/**
 * Deletes a preview from the preview storage.
 * @param {PreviewClient} previewClient - The client instance for preview operations
 * @param {string} previewName - The name/version of the preview to delete
 */
async function deletePreview (previewClient, previewName) {
  await previewClient.deletePreview(previewName);
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
