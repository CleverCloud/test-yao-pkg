#!/usr/bin/env node

import pkg from '@yao-pkg/pkg';
import { styleText } from 'node:util';

/** @type {string} */
const NODE_RANGE = 'node22';

/** @type {Record<string, string>} */
const PLATFORMS = {
  linux: 'linux',
  macos: 'macos',
  win: 'win',
};

/** @type {Record<string, string>} */
const ARCHS = {
  linux: 'x64',
  macos: 'arm64',
  win: 'x64',
};

/**
 * Build binary for specified os, platform and architecture
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.version] - The version to build
 * @param {string} [options.nodeVersion] - Node.js version range
 * @param {'linux'|'macos'|'win'} [options.os] - Operating system
 * @param {'linux'|'macos'|'win'} [options.platform] - Target platform
 * @param {'x64'|'arm64'} [options.arch] - Target architecture
 * @returns {Promise<void>}
 */
export async function buildBinary (options = {}) {

  const {
    version,
    nodeVersion = NODE_RANGE,
    os,
    platform = PLATFORMS[os],
    arch = ARCHS[os],
  } = options;

  const input = `build/${version}/clever.cjs`;
  const output = `build/${version}/${os}/clever`;
  console.log(`=> Build script ${styleText('yellow', input)} into binary ${styleText('yellow', output)} with @yao-pkg/pkg`);
  console.log(`   for ${styleText('yellow', platform)} (${styleText('yellow', arch)}) with Node.js ${styleText('yellow', nodeVersion)}`);
  await pkg.exec([input, '--target', `${nodeVersion}-${platform}-${arch}`, '--output', output]);
}
