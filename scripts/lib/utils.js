import { styleText } from 'node:util';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import { platform } from 'node:os';
import crypto from 'node:crypto';

/**
 * Sanitizes a version string by replacing forward slashes with hyphens.
 * This is useful for converting branch names to version identifiers.
 * @param {string} rawVersion - The raw version string to sanitize
 * @returns {string}
 */
export function getVersion (rawVersion) {
  return rawVersion.replaceAll('/', '-');
}

/**
 * Gets the current operating system in a normalized format.
 * Maps Node.js platform() values to simplified OS names.
 * @returns {'linux'|'macos'|'win'}
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
 * @param {'linux'|'macos'|'win'} os - The operating system
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

/**
 * Calculates the SHA256 hash of a file.
 * @param {string} inputPath - Path to the file to hash
 * @returns {string}
 */
export function getSha256 (inputPath) {
  const content = fs.readFileSync(inputPath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash;
}

/**
 * Creates a clickable terminal link using ANSI escape sequences.
 * The link will be styled in blue and clickable in supported terminals.
 * @param {string} url - The URL to link to
 * @param {string} [text=url] - The display text for the link, defaults to the URL
 * @returns {string}
 */
export function createTerminalLink (url, text = url) {
  return `\u001b]8;;${url}\u001b\\${styleText('blue', text)}\u001b]8;;\u001b\\`;
}

/**
 * Template literal tag function that highlights interpolated values in yellow.
 * Used for creating highlighted console output with template literals.
 * @param {string[]} strings - The string parts of the template literal
 * @param {...any} values - The interpolated values to highlight
 * @returns {string}
 */
export function highlight (strings, ...values) {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      result += styleText('yellow', String(values[i]));
    }
  }
  return result;
}

/**
 * Executes a shell command asynchronously and logs the output.
 * Prints the command being executed and any stdout/stderr output.
 * @param {string} command - The shell command to execute
 * @param {string} [cwd] - The working directory to execute the command in
 * @returns {Promise<void>}
 * @throws {Error} When the command fails
 */
export function exec (command, cwd) {
  if (cwd != null) {
    console.log(styleText('blue', '=> cd ' + cwd));
  }
  console.log(styleText('blue', '=> ') + styleText('blue', command));
  return new Promise((resolve, reject) => {
    const child = childProcess.exec(command, { cwd });

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Command failed with exit code ${code}`));
      }
      return resolve();
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Executes a shell command synchronously and returns the output.
 * @param {string} command - The shell command to execute
 * @param {string} [stdin] - Optional text to pass to the command via stdin
 * @returns {Promise<void>}
 * @throws {Error} When the command fails
 */
export function execSync (command, stdin) {
  console.log(styleText('blue', '=> ') + styleText('blue', command));
  const stdout = childProcess.execSync(command, { stdin });
  console.log(stdout);
  return stdout;
}

/**
 * Recursively removes a directory and all its contents.
 * Uses force option to ignore errors if the directory doesn't exist.
 * @param {string} path - The path to the directory to remove
 */
export async function clearDirectory (path) {
  fs.rmSync(path, { recursive: true, force: true });
}
