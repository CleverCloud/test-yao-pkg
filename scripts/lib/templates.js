// import _ from 'lodash';
// import fs from 'fs-extra';
// import glob from 'glob';
import { globSync } from 'node:fs';

// This disables ES6+ template delimiters
// _.templateSettings.interpolate = /<%=([\s\S]+?)%>/g;

export async function applyTemplates (destPath, templatesPath, templateData) {
  const filenames = glob.sync('**/*', { dot: true, nodir: true, cwd: templatesPath });
  console.log(filenames);
  // for (const file of filenames) {
  //   const templateFilepath = `${templatesPath}/${file}`;
  //   const destFilepath = `${destPath}/${file}`;
  //   await applyOneTemplate(destFilepath, templateFilepath, templateData);
  // }
}

export async function writeStringToFile (content, destFilepath) {
  // await fs.ensureFile(destFilepath);
  // await fs.writeFile(destFilepath, content);
}

export async function applyOneTemplate (destFilepath, templateFilepath, templateData) {
  // const template = await fs.readFile(templateFilepath, 'utf-8');
  // const contents = _.template(template)(templateData);
  // await fs.ensureFile(destFilepath);
  // await fs.writeFile(destFilepath, contents);
}
