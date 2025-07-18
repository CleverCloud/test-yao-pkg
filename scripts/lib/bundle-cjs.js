import { exec } from './utils.js';
import { getBundleCjsPath } from './paths.js';

/**
 * Bundle the whole project to a single CommonJS file with Rollup
 * @param {string} version - The version to build
 * @returns {Promise<void>}
 */
export async function bundleToSingleCjs (version) {
  const filename = getBundleCjsPath(version);
  await exec(`npx rollup -c rollup.config.js -o ${filename}`);
}
