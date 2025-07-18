import fs from 'node:fs';
import crypto from 'node:crypto';

export function getSha256 (inputPath) {
  const content = fs.readFileSync(inputPath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash;
}
