#!/usr/bin/env node

/**
 * CLI script to publish a new version to Docker Hub.
 * 
 * This script updates Docker-related files, builds Docker images for both
 * the specific version and latest tag, and pushes them to Docker Hub.
 * It also commits changes to the associated Git repository.
 * 
 * @usage node publish-dockerhub.js <version>
 * @param {string} version - Version string (e.g., "1.2.3")
 * @throws {Error} When version argument is missing
 * @requires DOCKERHUB_USERNAME - Environment variable for Docker Hub username
 * @requires DOCKERHUB_TOKEN - Environment variable for Docker Hub access token
 * @requires DOCKER_IMAGE_NAME - Environment variable for Docker image name
 * @requires DOCKERHUB_GIT_URL - Environment variable for Docker repository URL
 */

import pkg from '../package.json' with { type: 'json' };
import { applyTemplates } from './lib/templates.js';
import { commitAndPush, tagAndPush } from './lib/git.js';
import { exec, execWithStdin, highlight, readEnvVars, run } from './lib/utils.js';
import { simpleGit } from 'simple-git';

const TEMPLATES_PATH = './scripts/templates/dockerhub';
const GIT_PATH = './git-dockerhub';

run(async () => {

  const [version] = process.argv.slice(2);
  if (version == null) {
    throw new Error('Missing version');
  }

  const [dockerHubUser, dockerHubToken, dockerImageName, gitUrl] = readEnvVars(['DOCKERHUB_USERNAME', 'DOCKERHUB_TOKEN', 'DOCKER_IMAGE_NAME', 'DOCKERHUB_GIT_URL']);

  console.log(highlight`=> Cloning dockerhub repository ${gitUrl} to ${GIT_PATH}`);
  await simpleGit().clone(gitUrl, GIT_PATH);

  await applyTemplates(GIT_PATH, TEMPLATES_PATH, {
    description: pkg.description,
    license: pkg.license,
    maintainer: pkg.maintainer,
    version,
  });

  await commitAndPush(GIT_PATH, gitUrl, pkg.author, version);
  await tagAndPush(GIT_PATH, gitUrl, version);

  await exec(`docker build -t ${dockerImageName}:latest -t ${dockerImageName}:${version} .`, { cwd: GIT_PATH });
  await execWithStdin(`docker login -u ${dockerHubUser} --password-stdin`, dockerHubToken);
  await exec(`docker push -a ${dockerImageName}`);
  await exec('docker logout');
});
