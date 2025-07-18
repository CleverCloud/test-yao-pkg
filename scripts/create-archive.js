#!/usr/bin/env node

import { OS_BY_PLATFORM } from './lib/config.js';
import { platform } from 'node:os';
import { createArchive } from './lib/create-archive.js';

const [rawVersion] = process.argv.slice(2);
const version = rawVersion.replace(/\//g, '-');

const os = OS_BY_PLATFORM[platform()];

await createArchive({ version, os });
