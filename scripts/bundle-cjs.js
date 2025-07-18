#!/usr/bin/env node

import { bundleToSingleCjs } from './lib/bundle-cjs.js';

const [rawVersion] = process.argv.slice(2);
const version = rawVersion.replace(/\//g, '-');

await bundleToSingleCjs({ version });
