export const BUILD_DIR = 'build';

/**
 * @param {string} version - The version
 * @return {string}
 */
export function getBundleCjsPath (version) {
  return `${BUILD_DIR}/${version}/clever.cjs`;
}

/**
 * @param {string} version - The version
 * @param {'linux'|'macos'|'win'} os - The operating system
 * @return {string}
 */
export function getBuildPath (version, os) {
  return `${BUILD_DIR}/${version}/${os}`;
}

/**
 * @param {'linux'|'macos'|'win'} os - The operating system
 * @return {string}
 */
export function getExecutableName (os) {
  return os === 'win' ? 'clever.exe' : 'clever';
}

/**
 * @param {string} version - The version
 * @param {'linux'|'macos'|'win'} os - The operating system
 * @return {string}
 */
export function getBinaryPath (version, os) {
  const executableName = getExecutableName(os);
  return `${getBuildPath(version, os)}/${executableName}`;
}

/**
 * @param {string} version - The version
 * @param {'linux'|'macos'|'win'} os - The operating system
 * @return {string}
 */
export function getArchiveName (version, os) {
  return os === 'win'
    ? `clever-tools-${version}_${os}.zip`
    : `clever-tools-${version}_${os}.tar.gz`;
}

export const PREVIEW_DIR = 'previews';

/**
 * @param {string} version - The version
 * @param {'linux'|'macos'|'win'} os - The operating system
 * @return {string}
 */
export function getPreviewPath (version, os) {
  if (os == null) {
    return `${PREVIEW_DIR}/${version}`;
  }
  return `${PREVIEW_DIR}/${version}/${os}`;
}

export const RELEASES_DIR = 'releases';

/**
 * @param {string} version - The version
 * @return {string}
 */
export function getReleasePath (version) {
  return `${RELEASES_DIR}/${version}`;
}

