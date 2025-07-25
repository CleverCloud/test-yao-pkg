#!/usr/bin/env node
//
// CLI script to publish a new version to Exherbo Linux package repository.
//
// This script creates a new exheres package file for the specified version
// and commits it to the Exherbo package repository. Exherbo uses versioned
// package files with the pattern packagename-version.exheres-0.
//
// USAGE: node publish-exherbo.js <version>
//
// ARGUMENTS:
//   version         Version string (e.g., "1.2.3")
//
// ENVIRONMENT VARIABLES:
//   EXHERBO_GIT_URL         Environment variable for Exherbo repository URL
//
// REQUIRED SYSTEM BINARIES:
//   git             For cloning, committing, and pushing to Exherbo repository
//
// EXAMPLES:
//   node publish-exherbo.js 1.2.3
//

import pkg from '../package.json' with { type: 'json' };
import { applyOneTemplate } from './lib/templates.js';
import { highlight, readEnvVars, run } from './lib/utils.js';
import { simpleGit } from 'simple-git';
import { commitAndPush } from './lib/git.js';

const TEMPLATES_PATH = './scripts/templates/exherbo/clever-tools-bin.exheres-0';
const GIT_PATH = './git-exherbo';
const PACKAGE_DIR = `${GIT_PATH}/packages/dev-util/clever-tools-bin`;

run(async () => {

  const [version] = process.argv.slice(2);
  if (version == null) {
    throw new Error('Missing version');
  }

  const [gitUrl] = readEnvVars(['EXHERBO_GIT_URL']);

  console.log(highlight`=> Cloning exherbo repository ${gitUrl} to ${GIT_PATH}`);
  await simpleGit().clone(gitUrl, GIT_PATH);

  const maintainer = pkg.author.match(/^(?<name>.+?) <(?<email>.+)>$/).groups;

  await applyOneTemplate(`${PACKAGE_DIR}/clever-tools-bin-${version}.exheres-0`, TEMPLATES_PATH, {
    copyrightYear: new Date().getFullYear(),
    description: pkg.description,
    license: pkg.license,
    maintainer: maintainer.email,
    maintainerEmail: pkg.author,
  });

  await commitAndPush(GIT_PATH, gitUrl, pkg.author, version, `dev-util/clever-tools-bin: bump to ${version}`);
});
