#!/usr/bin/env node

import { buildBinary } from './lib/build-binary.js';
import { getOs, getVersion } from './lib/utils.js';

const [rawVersion] = process.argv.slice(2);
if (rawVersion == null) {
  throw new Error('Missing version');
}

const version = getVersion(rawVersion);
const os = getOs();

await buildBinary({ version, os });
