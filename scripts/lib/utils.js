import { styleText } from 'node:util';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import { platform } from 'node:os';
import crypto from 'node:crypto';

export function getVersion (rawVersion) {
  return rawVersion.replaceAll('/', '-');
}

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

export function getEmoji (os) {
  switch (os) {
    case 'linux':
      return '🐧';
    case 'darwin':
      return '🍏';
    case 'win32':
      return '🪟';
  }
}

export function getSha256 (inputPath) {
  const content = fs.readFileSync(inputPath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash;
}

export function createTerminalLink (url, text = url) {
  return `\u001b]8;;${url}\u001b\\${styleText('blue', text)}\u001b]8;;\u001b\\`;
}

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

export function exec (command, cwd) {
  if (cwd != null) {
    console.log(styleText('blue', '=> cd ' + cwd));
  }
  console.log(styleText('blue', '=> ') + styleText('blue', `${command}`) + ' ');
  return new Promise((resolve, reject) => {
    childProcess.exec(command, { cwd }, (err, stdout, stderr) => {
      if (stdout !== '') {
        console.log(stdout);
      }
      if (stderr !== '') {
        console.error(stderr);
      }
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}

export function execSync (command, cwd) {
  const stdout = childProcess.execSync(command, { cwd });
  return stdout.toString().trim();
}

export async function clearDirectory (path) {
  fs.rmSync(path, { recursive: true, force: true });
}
