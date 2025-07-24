#!/usr/bin/env node

/**
 * CLI script to create platform-specific archive from built binary.
 * 
 * This script packages the compiled binary into a compressed archive
 * (tar.gz for Unix-like systems, zip for Windows) ready for distribution.
 * 
 * @usage node create-archive.js <version>
 * @param {string} version - Version string (e.g., "1.2.3")
 * @throws {Error} When version argument is missing
 */

import { createArchive } from './lib/create-archive.js';
import { getOs, getVersion, run } from './lib/utils.js';

run(async () => {
  const [rawVersion] = process.argv.slice(2);
  if (rawVersion == null) {
    throw new Error('Missing version');
  }

  const version = getVersion(rawVersion);
  const os = getOs();

  await createArchive(version, os);
});
