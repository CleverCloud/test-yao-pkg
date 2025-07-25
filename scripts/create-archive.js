#!/usr/bin/env node
//
// CLI script to create platform-specific archive from built binary.
//
// This script packages the compiled binary into a compressed archive
// (tar.gz for Unix-like systems, zip for Windows) ready for distribution.
//
// USAGE: node create-archive.js <version>
//
// ARGUMENTS:
//   version         Version string (e.g., "1.2.3")
//
// REQUIRED SYSTEM BINARIES:
//   tar             For creating tar.gz archives (Unix-like systems)
//   zip             For creating zip archives (Windows)
//
// EXAMPLES:
//   node create-archive.js 1.2.3
//

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
