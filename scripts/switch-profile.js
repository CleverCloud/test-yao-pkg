#!/usr/bin/env node

import { argv } from 'node:process';
import { readJson, run, writeJson } from './lib/utils.js';
import { execSync } from 'node:child_process';
import { TerminalTable } from './lib/terminal-table.js';
import { select } from '@inquirer/prompts';
import { styleText } from 'node:util';

const CONFIG_DIR = `${process.env.HOME}/.config/clever-cloud`;
const CONFIG_PATH = `${CONFIG_DIR}/clever-tools.json`;
const PROFILES_PATH = `${CONFIG_DIR}/profiles.json`;

run(async function () {

  let currentTokens;
  try {
    currentTokens = readJson(CONFIG_PATH);
  }
  catch (error) {
    console.error('Failed to read config:', error.message);
    return;
  }

  let self;
  try {
    const selfJson = execSync('clever curl -s https://api.clever-cloud.com/v2/self', { encoding: 'utf8' });
    self = JSON.parse(selfJson);
  }
  catch (error) {
    console.error('Failed to fetch user info:', error.message);
    self = { type: 'error' };
  }

  let currentProfile = null;
  if (self.type !== 'error') {
    currentProfile = {
      name: self.name,
      email: self.email,
      id: self.id,
      ...currentTokens,
    };
  }

  let profiles;
  try {
    profiles = readJson(PROFILES_PATH, []);
  }
  catch (error) {
    console.error('Failed to read profiles:', error.message);
    return;
  }

  if (currentProfile != null) {
    const currentStoredProfile = profiles.find(({ id }) => id === currentProfile.id);
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

  try {
    writeJson(PROFILES_PATH, profiles);
  }
  catch (error) {
    console.error('Failed to save profiles:', error.message);
    return;
  }

  const availableProfiles = profiles.filter(({ current }) => !current);

  if (availableProfiles.length === 0) {
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

  const userIdArg = argv[2];

  let profileToSwitch;
  if (userIdArg != null) {
    if (!/^[a-zA-Z0-9_-]+$/.test(userIdArg)) {
      return console.log('Invalid profile ID format');
    }
    profileToSwitch = profiles.find((profile) => profile.id === userIdArg);
  }
  else {
    const selectedProfileId = await select({
      message: 'Select a user account',
      choices: availableProfiles.map((profile) => ({
        name: profile.email,
        value: profile.id,
      })),
    }).catch((error) => {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        process.exit(1);
      }
      throw error;
    });
    profileToSwitch = profiles.find((profile) => profile.id === selectedProfileId);
  }

  if (profileToSwitch == null) {
    return console.log('Invalid choice :-(');
  }

  const tokens = {
    token: profileToSwitch.token,
    secret: profileToSwitch.secret,
  };

  try {
    writeJson(CONFIG_PATH, tokens);
    console.log(`Switched to profile: ${profileToSwitch.email}`);
  }
  catch (error) {
    console.error('Failed to save config:', error.message);
    return;
  }

});
