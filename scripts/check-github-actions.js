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

  console.log(`## Workflows (${workflowFiles.length})\n`);
  const formattedWorkflows = workflowFiles.map((file) => `- ${file}`).join('\n');
  console.log(`${formattedWorkflows}`);

  const requiredSecrets = new Set();
  const requiredVariables = new Set();
  for (const file of workflowFiles) {
    const content = readFileSync(file, 'utf8');
    for (const [_, match] of content.matchAll(SECRET_REGEX)) {
      if (match !== 'GITHUB_TOKEN') {
        requiredSecrets.add(match);
      }
    }
    for (const [_, match] of content.matchAll(VARIABLES_REGEX)) {
      requiredVariables.add(match);
    }
  }

  const currentSecrets = getListFrom('gh secret list --json name', { encoding: 'utf8' });
  const currentVariables = getVariablesWithValues();

  const missingSecrets = [...requiredSecrets.difference(currentSecrets)].sort();
  const notUsedSecrets = [...currentSecrets.difference(requiredSecrets)].sort();
  const properlySetSecrets = [...currentSecrets.intersection(requiredSecrets)].sort();

  const currentVariableNames = new Set(currentVariables.map(v => v.name));
  const missingVariables = [...requiredVariables.difference(currentVariableNames)].sort();
  const notUsedVariables = [...currentVariableNames.difference(requiredVariables)].sort();
  const properlySetVariables = currentVariables.filter(v => requiredVariables.has(v.name)).sort((a, b) => a.name.localeCompare(b.name));

  const totalSecrets = properlySetSecrets.length + missingSecrets.length + notUsedSecrets.length;
  const totalVariables = properlySetVariables.length + missingVariables.length + notUsedVariables.length;

  console.log(`\n## Secrets (${requiredSecrets.size})\n`);
  
  if (requiredSecrets.size === 0) {
    console.log('No secrets required.');
  } else {
    const sortedRequiredSecrets = [...requiredSecrets].sort();
    for (const secret of sortedRequiredSecrets) {
      const status = currentSecrets.has(secret) ? '✅' : '❌';
      console.log(`- ${status} ${secret}`);
    }
  }
  
  if (notUsedSecrets.length > 0) {
    console.log(`\n${notUsedSecrets.length} unused secret(s): ${notUsedSecrets.join(', ')}`);
  }

  console.log(`\n## Variables (${requiredVariables.size})\n`);
  
  if (requiredVariables.size === 0) {
    console.log('No variables required.');
  } else {
    const sortedRequiredVariables = [...requiredVariables].sort();
    for (const variable of sortedRequiredVariables) {
      const currentVar = currentVariables.find(v => v.name === variable);
      if (currentVar) {
        console.log(`- ✅ ${variable}: ${currentVar.value}`);
      } else {
        console.log(`- ❌ ${variable}`);
      }
    }
  }
  
  if (notUsedVariables.length > 0) {
    console.log(`\n${notUsedVariables.length} unused variable(s): ${notUsedVariables.join(', ')}`);
  }

  if (missingSecrets.length > 0 || missingVariables.length > 0) {
    process.exit(1);
  }
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
 * Gets variables with their values from GitHub CLI.
 *
 * @returns {Array<{name: string, value: string}>} Array of variable objects with name and value
 */
function getVariablesWithValues () {
  const listJson = execSync('gh variable list --json name,value', { encoding: 'utf8' });
  const list = JSON.parse(listJson);
  return list;
}

