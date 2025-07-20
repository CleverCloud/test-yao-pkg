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
 * @param {'linux'|'macos'|'win'} [os] - The operating system
 * @return {string}
 */
export function getBuildPath (version, os) {
  if (os == null) {
    return `${BUILD_DIR}/${version}`;
  }
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

/**
 * @param {string} version - The version
 * @return {string}
 */
export function getRpmName (version) {
  return `clever-tools-${version}.rpm`;
}

/**
 * @param {string} version - The version
 * @return {string}
 */
export function getDebName (version) {
  return `clever-tools-${version}.deb`;
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

/**
 * @param {'bundle'|'binary'|'archive'|'rpm'|'deb'} type - Asset type
 * @param {string} version - The version
 * @param {'linux'|'macos'|'win'} [os] - Operating system
 * @return {string}
 */
function getFilename (type, version, os) {
  switch (type) {
    case 'bundle':
      return 'clever.cjs';
    case 'binary':
      return getExecutableName(os);
    case 'archive':
      return getArchiveName(version, os);
    case 'rpm':
      return `clever-tools-${version}.rpm`;
    case 'deb':
      return `clever-tools-${version}.deb`;
  }
}

/**
 * @param {'local'|'preview'|'release'} location - Location type
 * @param {string} version - The version
 * @param {'linux'|'macos'|'win'} [os] - Operating system
 * @param {'bundle'|'binary'|'archive'|'rpm'|'deb'} type - Asset type
 * @return {string}
 */
function getDirectory (location, version, os, type) {
  switch (location) {
    case 'local':
      if (os && (type === 'binary' || type === 'archive')) {
        return `${BUILD_DIR}/${version}/${os}`;
      }
      return `${BUILD_DIR}/${version}`;
    case 'preview':
      if (os && (type === 'binary' || type === 'archive')) {
        return `${PREVIEW_DIR}/${version}/${os}`;
      }
      return `${PREVIEW_DIR}/${version}`;
    case 'release':
      return `${RELEASES_DIR}/${version}`;
  }
}

/**
 * Get the parts of an asset path
 * @param {'bundle'|'binary'|'archive'|'rpm'|'deb'} type - Asset type
 * @param {string} version - The version
 * @param {'local'|'preview'|'release'} location - Where the asset should be located
 * @param {'linux'|'macos'|'win'} [os] - Operating system (required for binary/archive)
 * @return {{ directory: string, filename: string }}
 */
export function getAssetParts (type, version, location, os) {
  const filename = getFilename(type, version, os);
  const directory = getDirectory(location, version, os, type);
  return { directory, filename };
}

/**
 * Get the path for any built asset
 * @param {'bundle'|'binary'|'archive'|'rpm'|'deb'} type - Asset type
 * @param {string} version - The version
 * @param {'local'|'preview'|'release'} location - Where the asset should be located
 * @param {'linux'|'macos'|'win'} [os] - Operating system (required for binary/archive)
 * @return {string}
 */
export function getAssetPath (type, version, location, os) {
  const { directory, filename } = getAssetParts(type, version, location, os);
  return directory === '' ? filename : `${directory}/${filename}`;
}
