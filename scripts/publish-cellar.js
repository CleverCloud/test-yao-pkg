#!/usr/bin/env node

import dedent from 'dedent';
import { CellarClient } from './lib/cellar-client.js';
import { getAssetPath } from './lib/paths.js';
import { highlight, readEnvVars, run } from './lib/utils.js';

run(async () => {

  const [bucket, accessKeyId, secretAccessKey] = readEnvVars([
    'CC_CLEVER_TOOLS_RELEASES_CELLAR_BUCKET',
    'CC_CLEVER_TOOLS_RELEASES_CELLAR_KEY_ID',
    'CC_CLEVER_TOOLS_RELEASES_CELLAR_SECRET_KEY',
  ]);

  const cellarClient = new CellarClient({
    bucket,
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
        const localPath = getAssetPath('archive', version, 'build', os);
        const remotePath = getAssetPath('archive', version, 'release', os);
        console.log(highlight`=> Upload ${localPath} to ${remotePath}`);
        await cellarClient.upload(localPath, remotePath);
      }
      break;
    case 'rpm':
      const localPath = getAssetPath('rpm', version, 'build');
      const remotePath = getAssetPath('rpm', version, 'release');
      console.log(highlight`=> Upload ${localPath} to ${remotePath}`);
      await cellarClient.upload(localPath, remotePath);
      break;
    case 'deb':
      const debLocalPath = getAssetPath('deb', version, 'build');
      const debRemotePath = getAssetPath('deb', version, 'release');
      console.log(highlight`=> Upload ${debLocalPath} to ${debRemotePath}`);
      await cellarClient.upload(debLocalPath, debRemotePath);
      break;
  }
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
      publish-to-cellar.js <version> <artifact>

    ARGUMENTS
      version   Version directory name in build/
      artifact  Type of artifact: archives, rpm, or deb

    EXAMPLES
      publish-to-cellar.js 1.2.3 archives
      publish-to-cellar.js 1.2.3 rpm
      publish-to-cellar.js 1.2.3 deb
  `;
}
