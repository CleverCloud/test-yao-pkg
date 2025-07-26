#!/usr/bin/env node
//
// Publish a new version to Windows Package Manager (winget).
//
// This script creates/updates a manifest for the Windows Package Manager
// repository using wingetcreate tool and submits it via pull request.
//
// USAGE: publish-winget.js <version>
//
// ARGUMENTS:
//   version         Version string (e.g., "1.2.3")
//
// ENVIRONMENT VARIABLES:
//   GITHUB_TOKEN                GitHub token with public_repo scope
//   CC_CLEVER_TOOLS_RELEASES_CELLAR_BUCKET  Cellar bucket for Windows archive
//   WINGET_PACKAGE_ID           Windows Package Manager package ID
//
// REQUIRED SYSTEM BINARIES:
//   winget          Windows Package Manager CLI
//   wingetcreate    Windows Package Manager Manifest Creator tool
//
// EXAMPLES:
//   publish-winget.js 1.2.3

import { highlight } from './lib/terminal.js';
import { ArgumentError, readEnvVars, runCommand } from './lib/command.js';
import { exec } from './lib/process.js';
import { getAssetParts, getAssetPath } from './lib/paths.js';
import { CellarClientPublic } from './lib/cellar-client-public.js';

runCommand(async () => {

  const [version] = process.argv.slice(2);
  if (version == null) {
    throw new ArgumentError('version');
  }

  const [githubToken, cellarBucket, packageId] = readEnvVars(['GITHUB_TOKEN', 'CC_CLEVER_TOOLS_RELEASES_CELLAR_BUCKET', 'WINGET_PACKAGE_ID']);

  // Construct the Windows archive URL from cellar using public client
  const cellarClient = new CellarClientPublic({ bucket: cellarBucket });
  const releasePath = getAssetParts('archive', version, 'build', 'win');
  const windowsArchiveUrl = cellarClient.getPublicUrl(releasePath);

  console.log(highlight(`=> Installing wingetcreate if not present`));
  try {
    await exec('wingetcreate --version', { quiet: true });
  } catch (error) {
    console.log(highlight('=> Installing wingetcreate...'));
    await exec('winget install Microsoft.WindowsPackageManagerManifestCreator');
  }

  console.log(highlight(`=> Creating/updating winget manifest for version ${version}`));
  console.log(highlight(`Package ID: ${packageId}`));
  console.log(highlight(`Archive URL: ${windowsArchiveUrl}`));

  try {
    // Try to update existing package first
    console.log(highlight('=> Attempting to update existing package...'));
    await exec(`wingetcreate update ${packageId} -u "${windowsArchiveUrl}" -v ${version} -t ${githubToken}`);
    console.log(highlight(`=> Successfully submitted winget manifest update for ${packageId} v${version}`));
  } catch (updateError) {
    console.log(highlight('=> Update failed, attempting to create new package...'));
    try {
      // If update fails, try creating new package
      await exec(`wingetcreate new "${windowsArchiveUrl}" -t ${githubToken}`);
      console.log(highlight(`=> Successfully submitted new winget manifest for ${packageId} v${version}`));
    } catch (createError) {
      console.error('Failed to create or update winget manifest');
      console.error('Update error:', updateError.message);
      console.error('Create error:', createError.message);
      throw createError;
    }
  }
});
