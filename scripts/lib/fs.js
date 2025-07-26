import crypto from 'node:crypto';
import fs from 'node:fs';

/**
 * Calculates the SHA256 hash of a file.
 * @param {string} inputPath - Path to the file to hash
 * @returns {string}
 */
export function getSha256(inputPath) {
  const content = fs.readFileSync(inputPath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash;
}

/**
 * Recursively removes a directory and all its contents.
 * Uses force option to ignore errors if the directory doesn't exist.
 * @param {string} path - The path to the directory to remove
 */
export async function clearDirectory(path) {
  fs.rmSync(path, { recursive: true, force: true });
}

/**
 * Reads and parses a JSON file, returning the parsed object or a default value if the file doesn't exist or is invalid.
 * @param {string} filePath - Path to the JSON file to read
 * @returns {any} The parsed JSON object or the default value
 */
export function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Writes an object to a JSON file with pretty formatting.
 * @param {string} filePath - Path to the JSON file to write
 * @param {any} data - The data to write as JSON
 */
export function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
