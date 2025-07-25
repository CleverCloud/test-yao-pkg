import { styleText } from 'node:util';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import { platform } from 'node:os';
import crypto from 'node:crypto';
import { EnvironmentVariableError } from './command.js';

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
  return styleText('blue', `\u001b]8;;${url}\u001b\\${text}\u001b]8;;\u001b\\`);
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
 * @param {{cwd?: string, env?: object, quiet?: boolean}} [options] - Options object with cwd, env, and quiet properties
 * @returns {Promise<void>}
 * @throws {Error} When the command fails
 */
export function exec (command, options = {}) {
  const { cwd, env, quiet = false } = options;

  if (!quiet) {
    if (cwd != null) {
      console.log(styleText('blue', '=> cd ' + cwd));
    }
    console.log(styleText('blue', '=> ') + styleText('blue', command));
  }
  return new Promise((resolve, reject) => {
    const execOptions = { cwd };
    if (env) {
      execOptions.env = { ...process.env, ...env };
    }
    const child = childProcess.exec(command, execOptions);

    if (!quiet) {
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
    }

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Command failed with exit code ${code}`));
      }
      return resolve();
    });

    child.on('error', (err) => {
      reject(new Error(`Command execution failed!`));
    });
  });
}

/**
 * Executes a shell command synchronously and returns the output.
 * @param {string} command - The shell command to execute
 * @param {string} [input] - Optional text to pass to the command via stdin
 * @returns {Promise<void>}
 * @throws {Error} When the command fails
 */
export function execWithStdin (command, input) {
  console.log(styleText('blue', '=> ') + styleText('blue', command));
  const stdout = childProcess.execSync(command, { input, encoding: 'utf8' });
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

/**
 * Reads environment variables and validates they are all present.
 * @param {string[]} variableNames - Array of environment variable names to read
 * @returns {string[]} Array of environment variable values in the same order
 * @throws {Error} When any environment variable is null, undefined, or empty string
 */
export function readEnvVars (variableNames) {
  const values = [];
  const missing = [];

  for (const varName of variableNames) {
    const value = process.env[varName];
    values.push(value);
    if (value == null || value === '') {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    const missingList = missing.map(name => `- ${name}`).join('\n');
    throw new EnvironmentVariableError('Missing environment variables:\n' + missingList);
  }

  return values;
}

/**
 * Reads and parses a JSON file, returning the parsed object or a default value if the file doesn't exist or is invalid.
 * @param {string} filePath - Path to the JSON file to read
 * @param {any} defaultValue - Default value to return if file doesn't exist or parsing fails
 * @returns {any} The parsed JSON object or the default value
 */
export function readJson (filePath, defaultValue = null) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }
  catch {
    return defaultValue;
  }
}

/**
 * Writes an object to a JSON file with pretty formatting.
 * @param {string} filePath - Path to the JSON file to write
 * @param {any} data - The data to write as JSON
 */
export function writeJson (filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

