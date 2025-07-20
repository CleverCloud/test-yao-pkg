#!/usr/bin/env node

import { exec, highlight } from './lib/utils.js';
import dedent from 'dedent';

// const IMAGE_NAME = 'clevercloud/clever-tools';
const IMAGE_NAME = 'hsablonniere/test';
const TEMPLATES_PATH = './scripts/templates/dockerhub';
const GIT_PATH = './git-dockerhub';
// const GIT_URL = 'ssh://git@github.com/CleverCloud/clever-tools-dockerhub.git';
const GIT_URL = `git@github.com:hsablonniere/test.git`;

const dockerUser = process.env.DOCKERHUB_USERNAME;
const dockerToken = process.env.DOCKERHUB_TOKEN;
if (dockerUser == null || dockerToken == null) {
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

const dockerHubConf = { username: dockerUser, token: dockerToken, imageName: IMAGE_NAME };

console.log(highlight`=> Cloning homebrew repository ${GIT_URL} to ${GIT_PATH}`);
// await simpleGit().clone(GIT_URL, GIT_PATH);
//
// console.log(highlight`=> Applying templates to ${GIT_PATH}`);
// await applyTemplates(GIT_PATH, TEMPLATES_PATH, {
//   description: pkg.description,
//   license: pkg.license,
//   maintainer: pkg.maintainer,
//   version,
// });
//
// await commitAndPush(GIT_PATH, GIT_URL, pkg.author, version);
// await tagAndPush(GIT_PATH, GIT_URL, version);

await exec(`docker build -t ${IMAGE_NAME}:latest -t ${IMAGE_NAME}:${version} .`, { cwd: GIT_PATH });
await exec(`docker login -u ${dockerUser} --password-stdin`, { stdin: dockerToken });
// await exec(`docker push -a ${IMAGE_NAME}`);
await exec('docker logout');
