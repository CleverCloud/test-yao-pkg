import { exec } from './utils.js';

/**
 * Bundle the whole project to a single CommonJS file with Rollup
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.version] - The version to build
 * @returns {Promise<void>}
 */
export async function bundleToSingleCjs (options = {}) {

  const { version } = options;

  await exec(`npx rollup -c rollup.config.js -o build/${version}/clever.cjs`);
}
