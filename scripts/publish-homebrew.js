#!/usr/bin/env node

import pkg from '../package.json' with { type: 'json' };
import { applyTemplates } from './lib/templates.js';
import { commitAndPush } from './lib/git.js';
import { getAssetPath } from './lib/paths.js';
import { getSha256, highlight, run } from './lib/utils.js';
import { simpleGit } from 'simple-git';

const GIT_PROJECT = 'homebrew-tap';
const TEMPLATES_PATH = './scripts/templates/homebrew';
const GIT_PATH = './git-homebrew';
// const GIT_URL = `ssh://git@github.com/CleverCloud/${GIT_PROJECT}.git`;
const GIT_URL = `git@github.com:hsablonniere/test.git`;

run(async () => {

  const [version] = process.argv.slice(2);
  if (version == null) {
    throw new Error('Missing version');
  }

  const archivePath = getAssetPath('archive', version, 'build', 'macos');
  const sha256 = getSha256(archivePath);

  console.log(highlight`=> Cloning homebrew repository ${GIT_URL} to ${GIT_PATH}`);
  await simpleGit().clone(GIT_URL, GIT_PATH);

  console.log(highlight`=> Applying templates to ${GIT_PATH}`);
  await applyTemplates(GIT_PATH, TEMPLATES_PATH, {
    description: pkg.description,
    gitProject: GIT_PROJECT,
    sha256,
    url: pkg.homepage,
    version,
  });

  await commitAndPush(GIT_PATH, GIT_URL, pkg.author, version);
});
