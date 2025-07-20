#!/usr/bin/env node

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
