import { exec } from './utils.js';

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

  await exec(`pkg -t ${nodeVersion}-${platform}-${arch} build/${version}/clever.cjs -o build/${version}/${os}/clever`);
}
