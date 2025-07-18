#!/usr/bin/env node

import { exec } from './lib/utils.js';
import { OS_BY_PLATFORM } from './lib/config.js';
import { platform } from 'node:os';

const [rawVersion] = process.argv.slice(2);
const version = rawVersion.replace(/\//g, '-');

const os = OS_BY_PLATFORM[platform()];

const workingDirectory = `build/${version}`;
await exec(`tar czf clever-tools-${version}_${os}.tar.gz clever`, `build/${version}/${os}`);
