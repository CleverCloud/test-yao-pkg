#!/usr/bin/env node

/**
 * CLI script to build platform-specific binary from bundled CommonJS.
 * 
 * This script compiles the bundled CJS file into a native executable
 * for the current platform using @yao-pkg/pkg.
 * 
 * @usage node build-binary.js <version>
 * @param {string} version - Version string (e.g., "1.2.3")
 * @throws {Error} When version argument is missing
 */

import { buildBinary } from './lib/build-binary.js';
import { getOs, getVersion, run } from './lib/utils.js';

run(async () => {
  const [rawVersion] = process.argv.slice(2);
  if (rawVersion == null) {
    throw new Error('Missing version');
  }

  const version = getVersion(rawVersion);
  const os = getOs();

  await buildBinary(version, os);
});
