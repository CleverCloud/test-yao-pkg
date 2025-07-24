#!/usr/bin/env node

/**
 * CLI script to bundle the application into a single CommonJS file.
 * 
 * This script creates a self-contained CJS bundle from the application source,
 * which is used as input for binary compilation.
 * 
 * @usage node bundle-cjs.js <version>
 * @param {string} version - Version string (e.g., "1.2.3")
 * @throws {Error} When version argument is missing
 */

import { bundleToSingleCjs } from './lib/bundle-cjs.js';
import { getVersion, run } from './lib/utils.js';

run(async () => {
  const [rawVersion] = process.argv.slice(2);
  if (rawVersion == null) {
    throw new Error('Missing version');
  }

  const version = getVersion(rawVersion);

  await bundleToSingleCjs(version);
});
