#!/usr/bin/env node

import { buildBinary } from './lib/build-binary.js';
import { OS_BY_PLATFORM } from './lib/config.js';
import { platform } from 'node:os';

const [rawVersion] = process.argv.slice(2);
const version = rawVersion.replace(/\//g, '-');

const os = OS_BY_PLATFORM[platform()];

await buildBinary({ version, os });
