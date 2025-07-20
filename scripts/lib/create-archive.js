import { exec } from './utils.js';
import { getAssetParts } from './paths.js';

/**
 * Creates an archive with the binary
 * @param {string} version - The version to build
 * @param {'linux'|'macos'|'win'} os - The operating system
 * @returns {Promise<void>}
 */
export async function createArchive (version, os) {

  const archive = getAssetParts('archive', version, 'local', os);
  const binary = getAssetParts('binary', version, 'local', os);

  const command = (os === 'win')
    ? `powershell -Command "Compress-Archive -DestinationPath ${archive.filename} -Path ${binary.filename}"`
    : `tar czf ${archive.filename} ${binary.filename}`;

  await exec(command, archive.directory);
}
