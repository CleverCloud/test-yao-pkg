#!/usr/bin/env node

import dedent from 'dedent';
import pkg from '../package.json' with { type: 'json' };
import { applyTemplates } from './lib/templates.js';
import { commitAndPush, tagAndPush } from './lib/git.js';
import { exec, highlight } from './lib/utils.js';
import { simpleGit } from 'simple-git';

// const IMAGE_NAME = 'clevercloud/clever-tools';
const IMAGE_NAME = 'hsablonniere/test';
const TEMPLATES_PATH = './scripts/templates/dockerhub';
const GIT_PATH = './git-dockerhub';
// const GIT_URL = 'ssh://git@github.com/CleverCloud/clever-tools-dockerhub.git';
const GIT_URL = `git@github.com:hsablonniere/test.git`;

const dockerHubUser = process.env.DOCKERHUB_USERNAME;
const dockerHubToken = process.env.DOCKERHUB_TOKEN;
if (dockerHubUser == null || dockerHubToken == null) {
  throw new Error(dedent`
    Could not read DockerHub credentials!
    You need the following environment variables:
      - DOCKERHUB_USERNAME
      - DOCKERHUB_TOKEN
  `);
}

const [version] = process.argv.slice(2);
if (version == null) {
  throw new Error('Missing version');
}

console.log(highlight`=> Cloning homebrew repository ${GIT_URL} to ${GIT_PATH}`);
await simpleGit().clone(GIT_URL, GIT_PATH);

console.log(highlight`=> Applying templates to ${GIT_PATH}`);
await applyTemplates(GIT_PATH, TEMPLATES_PATH, {
  description: pkg.description,
  license: pkg.license,
  maintainer: pkg.maintainer,
  version,
});

await commitAndPush(GIT_PATH, GIT_URL, pkg.author, version);
await tagAndPush(GIT_PATH, GIT_URL, version);

await exec(`docker build -t ${IMAGE_NAME}:latest -t ${IMAGE_NAME}:${version} .`, { cwd: GIT_PATH });
await exec(`docker login -u ${dockerHubUser} --password-stdin`, { stdin: dockerHubToken });
await exec(`docker push -a ${IMAGE_NAME}`);
await exec('docker logout');
