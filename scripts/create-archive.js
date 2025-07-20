#!/usr/bin/env node

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
