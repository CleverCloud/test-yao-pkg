#!/usr/bin/env node

import { bundleToSingleCjs } from './lib/bundle-cjs.js';
import { getVersion } from './lib/utils.js';

const [rawVersion] = process.argv.slice(2);
if (rawVersion == null) {
  throw new Error('Missing version');
}

const version = getVersion(rawVersion);

await bundleToSingleCjs(version);
