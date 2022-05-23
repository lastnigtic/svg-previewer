#!/usr/bin/env node

import { program } from 'commander';
import { startServer } from './server';

program
	.option('-d, --directory <string>', 'relative directory to preview svg files.', '.')
	.option('-o, --open <boolean>', 'open page in browser', true);

program.parse();

startServer({ ...program.opts() });
