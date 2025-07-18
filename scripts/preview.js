#!/usr/bin/env node

import { styleText } from 'node:util';
import { platform } from 'node:os';
import textTable from 'text-table';
import stringLength from 'string-length';
import { OS_BY_PLATFORM, OS_EMOJIS } from './lib/config.js';
import { clearDirectory, createTerminalLink } from './lib/utils.js';
import { getCurrentBranch } from './lib/git.js';
import { PreviewClient } from './lib/preview-client.js';
import { bundleToSingleCjs } from './lib/bundle-cjs.js';
import { buildBinary } from './lib/build-binary.js';
import { createArchive } from './lib/create-archive.js';
import dedent from 'dedent';

async function run () {

  const accessKeyId = process.env.CC_CLEVER_TOOLS_PREVIEWS_CELLAR_KEY_ID;
  const secretAccessKey = process.env.CC_CLEVER_TOOLS_PREVIEWS_CELLAR_SECRET_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Could not read Cellar access/secret keys! You need the following environment variables: CC_CLEVER_TOOLS_PREVIEWS_CELLAR_KEY_ID and CC_CLEVER_TOOLS_PREVIEWS_CELLAR_SECRET_KEY');
  }

  const previewClient = new PreviewClient({
    accessKeyId,
    secretAccessKey,
  });

  const [command, rawPreviewName] = process.argv.slice(2);
  if (command == null || command.length === 0) {
    throw new Error('Missing command');
  }
  const previewName = (rawPreviewName ?? getCurrentBranch()).replace(/\//g, '-');

  const os = OS_BY_PLATFORM[platform()];

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

  throw new Error('Unknown command!');
}

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
      return `${OS_EMOJIS[u.os]} ${createTerminalLink(u.url, u.os)}`;
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

async function getPreviewPrComment (previewClient, previewName) {
  const preview = await previewClient.getPreview(previewName);

  if (preview == null) {
    console.log(`No preview for "${previewName}" could be found.`);
    process.exit(1);
  }

  const links = preview.urls
    .map((u) => {
      const name = `${OS_EMOJIS[u.os]}`;
      const link = `[${u.os}](${u.url})`;
      const checksum = `\`${u.checksum.value}\``;
      return `* ${name} ${link} ${checksum}`;
    })
    .join('\n');

  console.log(dedent`
    🔎 A preview has been automatically published:
  
    ${links}
  
    _This preview will be deleted once this PR is closed._
  `);
}

async function buildPreview (previewClient, previewName, os) {
  const workingDirectory = `build/${previewName}`;
  console.log(`=> Clear ${workingDirectory}`);
  await clearDirectory(workingDirectory);

  const version = previewName;

  await bundleToSingleCjs({ version, os });
  await buildBinary({ version, os });
  await createArchive({ version, os });
}

async function publishPreview (previewClient, previewName, os) {
  await previewClient.publishPreview(previewName, os);
}

async function deletePreview (previewClient, previewName) {
  await previewClient.deletePreview(previewName);
}

run().catch((e) => {
  console.error(e.message);
  if (e.message === 'Missing command') {
    console.error('Usage: preview.js <command> [preview-name]');
    console.error('Available commands: list, pr-comment, build, publish or delete');
  }
  process.exit(1);
});
