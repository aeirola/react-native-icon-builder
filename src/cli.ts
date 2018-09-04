#!/usr/bin/env node
import * as fs from 'fs';
import { argv } from 'process';

import { decodeConfig, IConfig } from './config';
import { generate } from './index';

function main(args: string[]) {
  if (args.length < 1) {
    process.stderr.write('Usage: react-native-icon-builder <config-file>\n');
    process.exit(1);
    return;
  }

  process.stdout.write('Building icons ...');
  let config;
  try {
    config = readConfig(args[0]);
  } catch (err) {
    process.stdout.write('\n');
    process.stderr.write(`Failed: ${err}\n`);
    process.exit(1);
    return;
  }

  generate(config)
    .then(generatedFiles => {
      process.stdout.write(' done!\n');
      process.stdout.write('Wrote:\n');
      generatedFiles.forEach(generatedFile =>
        process.stdout.write(`- ${generatedFile}\n`)
      );
    })
    .catch(err => {
      process.stdout.write('\n');
      process.stderr.write(`Failed: ${err}\n`);
      process.exit(1);
    });
}

function readConfig(configFilePath: string): IConfig {
  const configFile = JSON.parse(
    fs.readFileSync(configFilePath, { encoding: 'utf-8' })
  );

  return decodeConfig(configFile);
}

if (require.main === module) {
  main(argv.slice(2));
}
