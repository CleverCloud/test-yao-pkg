#!/usr/bin/env node

import { highlight, run } from './lib/utils.js';

run(async () => {

  const [version] = process.argv.slice(2);
  if (version == null) {
    throw new Error('Missing version');
  }

  console.log(highlight('=> winget command to prepare things'));
  console.log(highlight('=> winget command to push the PR'));
});
