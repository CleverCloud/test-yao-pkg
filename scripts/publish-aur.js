#!/usr/bin/env node

/**
 * CLI script to publish a new version to Arch User Repository (AUR).
 * 
 * This script updates the PKGBUILD file for the AUR package with new version
 * information, calculates the SHA256 hash of the Linux archive, and commits
 * the changes to the AUR repository.
 * 
 * @usage node publish-aur.js <version>
 * @param {string} version - Version string (e.g., "1.2.3")
 * @throws {Error} When version argument is missing
 * @requires AUR_GIT_URL - Environment variable for AUR repository URL
 */

import pkg from '../package.json' with { type: 'json' };
import { applyTemplates } from './lib/templates.js';
import { commitAndPush } from './lib/git.js';
import { getAssetPath } from './lib/paths.js';
import { getSha256, highlight, readEnvVars, run } from './lib/utils.js';
import { simpleGit } from 'simple-git';

const PKGBASE = 'clever-tools-bin';
const TEMPLATES_PATH = './scripts/templates/aur';
const GIT_PATH = './git-aur';

run(async () => {

  const [version] = process.argv.slice(2);
  if (version == null) {
    throw new Error('Missing version');
  }

  const [gitUrl] = readEnvVars(['AUR_GIT_URL']);

  const archivePath = getAssetPath('archive', version, 'build', 'linux');
  const sha256 = getSha256(archivePath);

  console.log(highlight`=> Cloning AUR repository ${gitUrl} to ${GIT_PATH}`);
  await simpleGit().clone(gitUrl, GIT_PATH);

  await applyTemplates(GIT_PATH, TEMPLATES_PATH, {
    description: pkg.description,
    license: pkg.license,
    maintainer: pkg.author,
    pkgbase: PKGBASE,
    sha256,
    url: pkg.homepage,
    version,
  });

  await commitAndPush(GIT_PATH, gitUrl, pkg.author, version);
});
