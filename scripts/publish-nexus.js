#!/usr/bin/env node

import fs from 'node:fs/promises';
import { getAssetPath } from './lib/paths.js';
import { highlight, readEnvVars, run } from './lib/utils.js';
import dedent from 'dedent';

const NEXUS_SERVER_URL = 'https://nexus.clever-cloud.com';

run(async () => {

  const [version, packager] = process.argv.slice(2);
  if (version == null) {
    throw new Error(getUsage('Missing version'));
  }
  if (packager == null) {
    throw new Error(getUsage('Missing packager, must be either "rpm" or "deb"'));
  }
  if (packager !== 'rpm' && packager !== 'deb') {
    throw new Error(getUsage('Invalid packager, must be either "rpm" or "deb"'));
  }

  const [nexusUser, nexusPassword, rpmRepository, debRepository] = readEnvVars(['NEXUS_USER', 'NEXUS_PASSWORD', 'NEXUS_RPM_REPOSITORY', 'NEXUS_DEB_REPOSITORY']);

  const url = packager === 'rpm'
    ? `${NEXUS_SERVER_URL}/repository/${rpmRepository}/clever-tools-${version}.rpm`
    : `${NEXUS_SERVER_URL}/repository/${debRepository}/`;
  const method = packager === 'rpm' ? 'PUT' : 'POST';

  const authorization = `Basic ${Buffer.from(`${nexusUser}:${nexusPassword}`).toString('base64')}`;

  const packagePath = getAssetPath(packager, version, 'build');
  const packageData = await fs.readFile(packagePath);

  console.log(highlight`=> Publishing ${packagePath} to ${url}`);
  const [response, fetchError] = await fetch(url, {
    method,
    headers: { authorization },
    body: packageData,
  }).then((r) => [r]).catch((err) => [null, err]);

  if (fetchError != null) {
    throw new Error(`${fetchError.message} / ${fetchError?.cause?.message}`);
  }
  if (!response?.ok || response?.status < 200 || response?.status >= 300) {
    throw new Error(`Upload failed with HTTP status ${response.status}: ${response.statusText}`);
  }

  console.log(highlight`=> ${packager.toUpperCase()} upload successful with status ${response.status}`);
});

/**
 *
 * @param {string} message
 * @return {string}
 */
function getUsage (message) {
  return dedent`
    ${message}

    USAGE
      publish-nexus.js <version> <packager>

    ARGUMENTS
      version   Version directory name in build/
      packager  Type of package to create: "rpm" or "deb"

    EXAMPLES
      publish-nexus.js 1.2.3 rpm
      publish-nexus.js 1.2.3 deb
  `;
}
