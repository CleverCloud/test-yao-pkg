import { execSync } from './utils.js';

export function getCurrentBranch () {
  const currentBranch = execSync('git branch --show-current');
  return currentBranch;
}

export function getCurrentCommit () {
  return execSync('git rev-parse HEAD');
}

export function getCurrentAuthor () {
  return execSync('git log -1 --pretty=format:\'%an\'');
}
