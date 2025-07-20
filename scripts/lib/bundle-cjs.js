import { exec } from './utils.js';
import { getAssetPath } from './paths.js';

/**
 * Bundle the whole project to a single CommonJS file with Rollup
 * @param {string} version - The version to build
 * @returns {Promise<void>}
 */
export async function bundleToSingleCjs (version) {
  const filename = getAssetPath('bundle', version, 'build');
  await exec(`npx rollup -c rollup.config.js -o ${filename}`);
}
