#!/usr/bin/env node

import dedent from 'dedent';
import { ReleaseClient } from './lib/release-client.js';
import { readEnvVars } from './lib/utils.js';

/**
 * Main entry point for the cellar publishing CLI tool.
 * @throws {Error} When required arguments are missing or invalid
 * @returns {Promise<void>}
 */
async function run () {

  const [accessKeyId, secretAccessKey] = readEnvVars(['CC_CLEVER_TOOLS_RELEASES_CELLAR_KEY_ID', 'CC_CLEVER_TOOLS_RELEASES_CELLAR_SECRET_KEY']);

  const releaseClient = new ReleaseClient({
    accessKeyId,
    secretAccessKey,
  });

  const [version, artifact] = process.argv.slice(2);

  if (version == null) {
    throw new Error(getUsage('Missing version parameter'));
  }

  if (artifact == null) {
    throw new Error(getUsage('Missing artifact parameter'));
  }

  const validArtifacts = ['archives', 'rpm', 'deb'];
  if (!validArtifacts.includes(artifact)) {
    throw new Error(getUsage(`Invalid artifact "${artifact}". Must be one of: ${validArtifacts.join(', ')}`));
  }

  switch (artifact) {
    case 'archives':
      const osList = ['linux', 'macos', 'win'];
      for (const os of osList) {
        await releaseClient.publishArchive(version, os);
      }
      break;
    case 'rpm':
      await releaseClient.publishRpm(version);
      break;
    case 'deb':
      await releaseClient.publishDeb(version);
      break;
  }
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
      publish-to-cellar.js <version> <artifact>

    ARGUMENTS
      version   Version directory name in build/
      artifact  Type of artifact: archives, rpm, or deb

    EXAMPLES
      publish-to-cellar.js v1.2.3 archives
      publish-to-cellar.js v1.2.3 rpm
      publish-to-cellar.js v1.2.3 deb
  `;
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
