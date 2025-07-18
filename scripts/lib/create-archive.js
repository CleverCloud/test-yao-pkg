import { exec } from './utils.js';

/**
 * Creates an archive for the specified os
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.version] - The version to build
 * @param {'linux'|'macos'|'win'} [options.os] - Operating system
 * @returns {Promise<void>}
 */
export async function createArchive (options = {}) {

  const {
    version,
    os = 'linux',
  } = options;

  const cwd = `build/${version}/${os}`;

  if (os === 'win') {
    await exec(`zip -r clever-tools-${version}_win.zip clever.exe`, cwd);
    return;
  }

  await exec(`tar czf clever-tools-${version}_${os}.tar.gz clever`, cwd);
}
