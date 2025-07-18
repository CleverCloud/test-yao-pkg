import { styleText } from 'node:util';
import childProcess from 'node:child_process';
import fs from 'node:fs';

export function createTerminalLink (url, text = url) {
  return `\u001b]8;;${url}\u001b\\${styleText('blue', text)}\u001b]8;;\u001b\\`;
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
