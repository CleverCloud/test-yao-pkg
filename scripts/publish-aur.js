#!/usr/bin/env node

import { getAssetPath } from './lib/paths.js';
import { getSha256 } from './lib/utils.js';
import { simpleGit } from 'simple-git';

const PKGBASE = 'clever-tools-bin';
const TEMPLATES_PATH = './scripts/templates/arch';
const GIT_PATH = '/tmp/git-aur';
// const GIT_URL = `ssh://aur@aur.archlinux.org/${pkgbase}.git`;
// const GIT_URL = `ssh://aur@aur.archlinux.org/clever-tools-bin.git`;
const GIT_URL = `git@github.com:hsablonniere/test.git`;

const [version] = process.argv.slice(2);
if (version == null) {
  throw new Error('Missing version');
}

const archivePath = getAssetPath('archive', version, 'build', 'linux');
const sha256 = getSha256(archivePath);

const git = simpleGit();
await git.clone(GIT_URL, GIT_PATH);

// await applyTemplates(gitPath, templatesPath, {
//   PKGBASE,
//   version,
//   sha256,
//   ...appInfos,
// });
// await commitAndPush({ gitPath, version });
// }
