#!/usr/bin/env node
//
// Publish a new version to Homebrew tap repository.
//
// This script updates the Homebrew formula with new version information,
// calculates the SHA256 hash of the macOS archive, and commits the changes
// to the Homebrew tap repository.
//
// USAGE: publish-homebrew.js <version>
//
// ARGUMENTS:
//   version         Version string (e.g., "1.2.3")
//
// ENVIRONMENT VARIABLES:
//   HOMEBREW_GIT_URL        Environment variable for Homebrew tap repository URL
//
// REQUIRED SYSTEM BINARIES:
//   git             For cloning, committing, and pushing to Homebrew repository
//
// EXAMPLES:
//   publish-homebrew.js 1.2.3
//

import pkg from '../package.json' with { type: 'json' };
import { applyTemplates } from './lib/templates.js';
import { commitAndPush } from './lib/git.js';
import { getAssetPath } from './lib/paths.js';
import { getSha256, highlight, readEnvVars } from './lib/utils.js';
import { runCommand, ArgumentError } from './lib/command.js';
import { simpleGit } from 'simple-git';

const GIT_PROJECT = 'homebrew-tap';
const TEMPLATES_PATH = './scripts/templates/homebrew';
const GIT_PATH = './git-homebrew';

runCommand(async () => {

  const [version] = process.argv.slice(2);
  if (version == null) {
    throw new ArgumentError('Missing version');
  }

  const [gitUrl] = readEnvVars(['HOMEBREW_GIT_URL']);

  const archivePath = getAssetPath('archive', version, 'build', 'macos');
  const sha256 = getSha256(archivePath);

  console.log(highlight`=> Cloning homebrew repository ${gitUrl} to ${GIT_PATH}`);
  await simpleGit().clone(gitUrl, GIT_PATH);

  await applyTemplates(GIT_PATH, TEMPLATES_PATH, {
    description: pkg.description,
    gitProject: GIT_PROJECT,
    sha256,
    url: pkg.homepage,
    version,
  });

  await commitAndPush(GIT_PATH, gitUrl, pkg.author, version);
});
