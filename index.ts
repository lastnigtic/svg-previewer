#!/usr/bin/env node

import { program } from 'commander';
import { startServer } from './server';

program
	.option('-d, --directory <string>', 'relative directory to preview svg files.')
	.option('-o, --open <boolean>', 'open page in browser', true)
	.argument('[directory]', 'relative directory to preview svg files.')
	.action((directory, options) => startServer({ directory, ...options }))
	.parse();
