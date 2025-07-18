import { exec } from './utils.js';
import { getArchiveName, getBuildPath, getExecutableName } from './paths.js';

/**
 * Creates an archive with the binary
 * @param {string} version - The version to build
 * @param {'linux'|'macos'|'win'} os - The operating system
 * @returns {Promise<void>}
 */
export async function createArchive (version, os) {

  const cwd = getBuildPath(version, os);

  const archiveName = getArchiveName(version, os);
  const executableName = getExecutableName(os);
  const command = (os === 'win')
    ? `powershell -Command "Compress-Archive -DestinationPath ${archiveName} -Path ${executableName}"`
    : `tar czf ${archiveName} ${executableName}`;

  await exec(command, cwd);
}
