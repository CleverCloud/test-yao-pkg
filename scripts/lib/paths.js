export const BUILD_DIR = 'build';
export const PREVIEW_DIR = 'previews';
export const RELEASES_DIR = 'releases';

/**
 * @param {'build'|'preview'|'release'} location - Location type
 * @param {string} version - The version
 * @param {'linux'|'macos'|'win'} [os] - Operating system
 * @param {'bundle'|'binary'|'archive'|'rpm'|'deb'} type - Asset type
 * @return {string}
 */
function getDirectory (location, version, os, type) {
  switch (location) {
    case 'build':
      if (type === 'binary' && os != null) {
        return `${BUILD_DIR}/${version}/${os}/clever-tools-${version}_${os}`;
      }
      if (type === 'archive' && os != null) {
        return `${BUILD_DIR}/${version}/${os}`;
      }
      return `${BUILD_DIR}/${version}`;
    case 'preview':
      if (type === 'binary' && os != null) {
        return `${PREVIEW_DIR}/${version}/${os}/clever-tools-${version}_${os}`;
      }
      if (type === 'archive' && os != null) {
        return `${PREVIEW_DIR}/${version}/${os}`;
      }
      return `${PREVIEW_DIR}/${version}`;
    case 'release':
      return `${RELEASES_DIR}/${version}`;
  }
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
      return os === 'win' ? 'clever.exe' : 'clever';
    case 'archive':
      return os === 'win'
        ? `clever-tools-${version}_${os}.zip`
        : `clever-tools-${version}_${os}.tar.gz`;
    case 'rpm':
      return `clever-tools-${version}.rpm`;
    case 'deb':
      return `clever-tools-${version}.deb`;
  }
}

/**
 * Get the parts of an asset path
 * @param {'bundle'|'binary'|'archive'|'rpm'|'deb'} type - Asset type
 * @param {string} version - The version
 * @param {'build'|'preview'|'release'} location - Where the asset should be located
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
 * @param {'build'|'preview'|'release'} location - Where the asset should be located
 * @param {'linux'|'macos'|'win'} [os] - Operating system (required for binary/archive)
 * @return {string}
 */
export function getAssetPath (type, version, location, os) {
  const { directory, filename } = getAssetParts(type, version, location, os);
  return directory === '' ? filename : `${directory}/${filename}`;
}
