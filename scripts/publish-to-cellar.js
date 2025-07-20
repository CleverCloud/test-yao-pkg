#!/usr/bin/env node

import dedent from 'dedent';

/**
 * Main entry point for the cellar publishing CLI tool.
 * @throws {Error} When required arguments are missing or invalid
 * @returns {Promise<void>}
 */
async function run() {
  const [version, artifact] = process.argv.slice(2);

  if (version == null) {
    throw new Error(getUsage('Missing version parameter'));
  }

  if (artifact == null) {
    throw new Error(getUsage('Missing artifact parameter'));
  }

  const validArtifacts = ['archives', 'rpm', 'deb'];
  if (!validArtifacts.includes(artifact)) {
    throw new Error(getUsage(`Invalid artifact "${artifact}". Must be one of: ${validArtifacts.join(', ')}`));
  }

  console.log(`=> Publishing to cellar:`);
  console.log(`   Version: ${version}`);
  console.log(`   Artifact: ${artifact}`);

  switch (artifact) {
    case 'archives':
      console.log(`=> [DUMMY] Processing archives artifact`);
      console.log(`   Source: build/${version}/archives/`);
      console.log(`   Destination: cellar://clever-tools-releases/archives/${version}/`);
      break;
    case 'rpm':
      console.log(`=> [DUMMY] Processing RPM artifact`);
      console.log(`   Source: build/${version}/rpm/`);
      console.log(`   Destination: cellar://clever-tools-releases/rpm/${version}/`);
      break;
    case 'deb':
      console.log(`=> [DUMMY] Processing DEB artifact`);
      console.log(`   Source: build/${version}/deb/`);
      console.log(`   Destination: cellar://clever-tools-releases/deb/${version}/`);
      break;
  }

  console.log(`=> [DUMMY] Upload completed successfully`);
}

/**
 * Generates a usage message for the CLI tool.
 * @param {string} message
 * @return {string}
 */
function getUsage(message) {
  return dedent`
    ${message}

    USAGE
      publish-to-cellar.js <version> <artifact>

    ARGUMENTS
      version   Version directory name in build/
      artifact  Type of artifact: archives, rpm, or deb

    EXAMPLES
      publish-to-cellar.js v1.2.3 archives
      publish-to-cellar.js v1.2.3 rpm
      publish-to-cellar.js v1.2.3 deb
  `;
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});