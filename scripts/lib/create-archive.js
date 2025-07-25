import { exec } from './process.js';
import { getAssetParts } from './paths.js';

/**
 * Creates an archive with the binary
 * @param {string} version - The version to build
 * @param {'linux'|'macos'|'win'} os - The operating system
 * @returns {Promise<void>}
 */
export async function createArchive (version, os) {

  const archive = getAssetParts('archive', version, 'build', os);
  const binary = getAssetParts('binary', version, 'build', os);

  const command = (os === 'win')
    ? `powershell -Command "Compress-Archive -DestinationPath ${archive.filename} -Path ${binary.directory}"`
    : `tar czf ${archive.filename} ${binary.directory}`;

  await exec(command, { cwd: archive.directory });
}
