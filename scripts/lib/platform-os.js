import { platform } from 'node:os';

/**
 * @typedef {import('./common.types.js').OS} OS
 */

/**
 * Gets the current operating system in a normalized format.
 * Maps Node.js platform() values to simplified OS names.
 * @returns {OS}
 */
export function getOs () {
  switch (platform()) {
    case 'linux':
      return 'linux';
    case 'darwin':
      return 'macos';
    case 'win32':
      return 'win';
  }
}

/**
 * Returns an emoji representing the given operating system.
 * @param {OS} os - The operating system
 * @returns {string}
 */
export function getEmoji (os) {
  switch (os) {
    case 'linux':
      return '🐧';
    case 'macos':
      return '🍏';
    case 'win':
      return '🪟';
  }
}