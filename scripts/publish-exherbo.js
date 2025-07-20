#!/usr/bin/env node

import pkg from '../package.json' with { type: 'json' };
import { applyOneTemplate } from './lib/templates.js';
import { highlight, run } from './lib/utils.js';
import { simpleGit } from 'simple-git';
import { commitAndPush } from './lib/git.js';

const TEMPLATES_PATH = './scripts/templates/exherbo/clever-tools-bin.exheres-0';
const GIT_PATH = './git-exherbo';
const PACKAGE_DIR = `${GIT_PATH}/packages/dev-util/clever-tools-bin`;
// const GIT_URL = `ssh://git@github.com/CleverCloud/CleverCloud-exheres.git`;
const GIT_URL = `git@github.com:hsablonniere/test.git`;

run(async () => {

  const [version] = process.argv.slice(2);
  if (version == null) {
    throw new Error('Missing version');
  }

  console.log(highlight`=> Cloning exherbo repository ${GIT_URL} to ${GIT_PATH}`);
  await simpleGit().clone(GIT_URL, GIT_PATH);

  const maintainer = pkg.author.match(/^(?<name>.+?) <(?<email>.+)>$/).groups;

  await applyOneTemplate(`${PACKAGE_DIR}/clever-tools-bin-${version}.exheres-0`, TEMPLATES_PATH, {
    copyrightYear: new Date().getFullYear(),
    description: pkg.description,
    license: pkg.license,
    maintainer: maintainer.email,
    maintainerEmail: pkg.author,
  });

  await commitAndPush(GIT_PATH, GIT_URL, pkg.author, version, `dev-util/clever-tools-bin: bump to ${version}`);
});
