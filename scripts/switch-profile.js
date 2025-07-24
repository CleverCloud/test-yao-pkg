#!/usr/bin/env node

import { argv } from 'node:process';
import { run, readJson, writeJson } from './lib/utils.js';
import { execSync } from 'node:child_process';
import { TerminalTable } from './lib/terminal-table.js';
import { select } from '@inquirer/prompts';
import { styleText } from 'node:util';

const CONFIG_DIR = `${process.env.HOME}/.config/clever-cloud`;
const CONFIG_PATH = `${CONFIG_DIR}/clever-tools.json`;
const PROFILES_PATH = `${CONFIG_DIR}/profiles.json`;

run(async function () {

  const currentTokens = readJson(CONFIG_PATH);

  const selfJson = await execSync('clever curl -s https://api.clever-cloud.com/v2/self');
  const self = JSON.parse(selfJson);

  const currentProfile = (self.type !== 'error')
    ? {
      name: self.name,
      email: self.email,
      id: self.id,
      ...currentTokens,
    }
    : null;

  const profiles = readJson(PROFILES_PATH, []);

  const currentStoredProfile = profiles.find(({ id }) => id === currentProfile.id);
  if (currentProfile != null) {
    if (currentStoredProfile == null) {
      profiles.push(currentProfile);
    }
    else {
      currentStoredProfile.name = currentProfile.name;
      currentStoredProfile.email = currentProfile.email;
      currentStoredProfile.token = currentProfile.token;
      currentStoredProfile.secret = currentProfile.secret;
      currentStoredProfile.expirationDate = currentProfile.expirationDate;
    }
  }

  for (const p of profiles) {
    p.current = (p.id === currentProfile?.id);
  }

  writeJson(PROFILES_PATH, profiles);

  const choices = profiles
    .filter(({ current }) => !current)
    .map(({ name, email, id }) => ({ name, email, id }));

  if (choices.length === 0) {
    return console.log('No profiles to switch to :-(');
  }

  const rows = profiles.map((profile, index) => {
    const style = profile.current ? 'yellow' : 'none';
    return [
      styleText(style, profile.name),
      styleText(style, profile.email),
      styleText(style, profile.id),
      styleText(style, profile.current ? 'Current profile' : ''),
    ];
  });

  const columns = [
    ['NAME'],
    ['EMAIL'],
    ['ID'],
    [''],
  ];

  const terminalTable = new TerminalTable(columns, rows);
  terminalTable.renderInit();

  let profileToSwitch;
  if (argv[2] != null) {
    profileToSwitch = profiles.find((profile) => profile.id === argv[2]);
  }
  else {
    const choiceIndex = await select({
      message: 'Select a user account',
      choices: choices.map((profile, index) => {
        return ({
          name: profile.email,
          value: index,
        });
      }),
    }).catch((error) => {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        process.exit(1);
      }
      throw error;
    });
    profileToSwitch = profiles[choiceIndex];
  }

  if (profileToSwitch == null) {
    return console.log('Invalid choice :-(');
  }

  const tokens = {
    token: profileToSwitch.token,
    secret: profileToSwitch.secret,
  };

  writeJson(CONFIG_PATH, tokens);

});
