// import _ from 'lodash';
// import fs from 'fs-extra';
// import glob from 'glob';
import { globSync } from 'tinyglobby';
import fs from 'node:fs/promises';
import path from 'node:path';
import { highlight } from './utils.js';

function lodashTemplate (template, variables) {
  return template.replace(/<%= (.*?) %>/g, (_, variableName) => {
    return variables[variableName];
  });
}

export async function applyTemplates (destPath, templatesPath, templateData) {
  const filenames = globSync('**/*', { dot: true, nodir: true, cwd: templatesPath });
  for (const file of filenames) {
    const templateFilepath = `${templatesPath}/${file}`;
    const destFilepath = `${destPath}/${file}`;
    await applyOneTemplate(destFilepath, templateFilepath, templateData);
  }
}

export async function writeStringToFile (content, destFilepath) {
  await fs.mkdir(path.dirname(destFilepath), { recursive: true });
  await fs.writeFile(destFilepath, content);
}

export async function applyOneTemplate (destFilepath, templateFilepath, templateData) {
  console.log(highlight`=> Applying template ${templateFilepath} to ${destFilepath}`);
  const template = await fs.readFile(templateFilepath, 'utf-8');
  const contents = lodashTemplate(template, templateData);
  await writeStringToFile(contents, destFilepath);
}
