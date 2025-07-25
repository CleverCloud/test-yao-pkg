#!/usr/bin/env node
//
// Publish build artifacts to Clever Cloud's Cellar storage.
//
// This script uploads various types of build artifacts (archives, RPM, DEB packages)
// to Cellar S3-compatible object storage for distribution and releases.
//
// USAGE: publish-cellar.js <version> <artifact>
//
// ARGUMENTS:
//   version         Version string (e.g., "1.2.3")
//   artifact        Type of artifact to upload ('archives', 'rpm', or 'deb')
//
// ENVIRONMENT VARIABLES:
//   CC_CLEVER_TOOLS_RELEASES_CELLAR_BUCKET      Environment variable for Cellar bucket name
//   CC_CLEVER_TOOLS_RELEASES_CELLAR_KEY_ID      Environment variable for Cellar access key ID
//   CC_CLEVER_TOOLS_RELEASES_CELLAR_SECRET_KEY  Environment variable for Cellar secret key
//
// REQUIRED SYSTEM BINARIES:
//
// EXAMPLES:
//   publish-cellar.js 1.2.3 archives
//   publish-cellar.js 1.2.3 rpm
//   publish-cellar.js 1.2.3 deb
//

import dedent from 'dedent';
import { CellarClient } from './lib/cellar-client.js';
import { getAssetPath } from './lib/paths.js';
import { highlight, readEnvVars } from './lib/utils.js';
import { runCommand, ArgumentError } from './lib/command.js';

runCommand(async () => {

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
    throw new ArgumentError('Missing version parameter');
  }
  if (artifact == null) {
    throw new ArgumentError('Missing artifact parameter');
  }

  const validArtifacts = ['archives', 'rpm', 'deb'];
  if (!validArtifacts.includes(artifact)) {
    throw new ArgumentError(`Invalid artifact "${artifact}". Must be one of: ${validArtifacts.join(', ')}`)
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

