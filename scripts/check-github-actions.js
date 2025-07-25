#!/usr/bin/env node
//
// Analyze GitHub Actions workflows and check secrets/variables usage.
//
// This script scans all workflow files in .github/workflows/, extracts required
// secrets and variables, compares them with what's actually configured in the
// repository, and generates a comprehensive report.
//
// USAGE: check-github-actions.js
//
// REQUIRED SYSTEM BINARIES:
//   gh              GitHub CLI for listing secrets and variables
//
// EXAMPLES:
//   check-github-actions.js

import { globSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { runCommand } from './lib/command.js';

const SECRET_REGEX = /\$\{\{\s*secrets\.([A-Z_][A-Z0-9_]*)\s*}}/g;
const VARIABLES_REGEX = /\$\{\{\s*vars\.([A-Z_][A-Z0-9_]*)\s*}}/g;

runCommand(async () => {

  console.log('# GitHub Actions secrets and vars report\n');

  const workflowFiles = globSync('.github/workflows/*.{yml,yaml}');
  logList('Found workflows', workflowFiles);

  const requiredSecrets = new Set();
  const requiredVariables = new Set();
  for (const file of workflowFiles) {
    const content = readFileSync(file, 'utf8');
    for (const [_, match] of content.matchAll(SECRET_REGEX)) {
      requiredSecrets.add(match);
    }
    for (const [_, match] of content.matchAll(VARIABLES_REGEX)) {
      requiredVariables.add(match);
    }
  }

  const currentSecrets = getListFrom('gh secret list --json name', { encoding: 'utf8' });
  const currentVariables = getListFrom('gh variable list --json name', { encoding: 'utf8' });

  const missingSecrets = [...requiredSecrets.difference(currentSecrets)].sort();
  const notUsedSecrets = [...currentSecrets.difference(requiredSecrets)].sort();
  const properlySetSecrets = [...currentSecrets.intersection(requiredSecrets)].sort();

  const missingVariables = [...requiredVariables.difference(currentVariables)].sort();
  const notUsedVariables = [...currentVariables.difference(requiredVariables)].sort();
  const properlySetVariables = [...currentVariables.intersection(requiredVariables)].sort();

  console.log('\n## Secrets\n');
  logList('Properly set', properlySetSecrets);
  logList('Missing', missingSecrets);
  logList('Not used', notUsedSecrets);

  console.log('\n## Variables\n');
  logList('Properly set', properlySetVariables);
  logList('Missing', missingVariables);
  logList('Not used', notUsedVariables);
});

/**
 * Executes a GitHub CLI command and extracts names from the JSON response.
 *
 * @param {string} command - GitHub CLI command to execute
 * @returns {Set<string>} Set of names extracted from the command output
 */
function getListFrom (command) {
  const listJson = execSync(command, { encoding: 'utf8' });
  const list = JSON.parse(listJson);
  const names = new Set(list.map((variable) => variable.name));
  return names;
}

/**
 * Formats an array of items as a bulleted list.
 * @param {string} title - The title to display before the list
 * @param {Array} items - The array of items to format
 */
function logList (title, items) {
  if (items.length === 0) {
    console.log(`- ${title}: none`);
  }
  else {
    const formattedItems = items.map((item) => `  - ${item}`).join('\n');
    console.log(`- ${title} (${items.length}):\n${formattedItems}`);
  }
}
