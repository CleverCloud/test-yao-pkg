#!/usr/bin/env node

import { getAssetPath } from './lib/paths.js';
import { getSha256 } from './lib/utils.js';
import { simpleGit } from 'simple-git';
import { applyTemplates } from './lib/templates.js';
import pkg from '../package.json' with { type: 'json' };

const PKGBASE = 'clever-tools-bin';
const TEMPLATES_PATH = './scripts/templates/aur';
const GIT_PATH = '/tmp/git-aur';
// const GIT_URL = `ssh://aur@aur.archlinux.org/${pkgbase}.git`;
const GIT_URL = `git@github.com:hsablonniere/test.git`;

const [version] = process.argv.slice(2);
if (version == null) {
  throw new Error('Missing version');
}

const archivePath = getAssetPath('archive', version, 'build', 'linux');
const sha256 = getSha256(archivePath);

const git = simpleGit(GIT_PATH);
await git.clone(GIT_URL, GIT_PATH);

await applyTemplates(GIT_PATH, TEMPLATES_PATH, {
  description: pkg.description,
  license: pkg.license,
  maintainer: pkg.author,
  pkgbase: PKGBASE,
  sha256,
  url: pkg.homepage,
  version,
});

await git.add('.');
await git.commit(`Update to ${version}`);
await git.push('origin');
