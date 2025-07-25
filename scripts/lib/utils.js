/**
 * Sanitizes a version string by replacing forward slashes with hyphens.
 * This is useful for converting branch names to version identifiers.
 * @param {string} rawVersion - The raw version string to sanitize
 * @returns {string}
 */
export function getVersion (rawVersion) {
  return rawVersion.replaceAll('/', '-');
}

