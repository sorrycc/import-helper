#!/usr/bin/env node

const { existsSync, readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const yParser = require('yargs-parser');
const chalk = require('chalk');

// print version and @local
const args = yParser(process.argv.slice(2));
if (args.v || args.version) {
  console.log(require('./package').version);
  if (existsSync(join(__dirname, './.local'))) {
    console.log(chalk.cyan('@local'));
  }
  process.exit(0);
}

if (!args._[0]) {
  console.error(chalk.red(`> Please specify the file.`));
  process.exit(1);
}

const root = args.root || process.cwd();
const file = join(root, args._[0]);
const originCode = readFileSync(file, 'utf-8');
const code = require('./lib/addImports')(originCode, {
  ...require('./lib/module/node'),
});

if (args.write && originCode !== code) {
  writeFileSync(file, code, 'utf-8');
} else {
  console.log(code);
}
