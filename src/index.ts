#!/usr/bin/env node
import { save } from './commands/save.js';
import { login } from './commands/login.js';
import { load } from './commands/load.js';
import { Command } from 'commander';
const program = new Command('SvelteLab CLI');

program
	.command('down <url_or_id> [destination]')
	.alias('download')
	.description(
		'download a sveltelab REPL in a local folder, you can either pass the id or the whole url and a destination folder',
	)
	.action((url_or_id: string, destination: string) => {
		save(url_or_id, destination);
	});

program
	.command('login')
	.description('log in sveltelab either with email and password or github')
	.action(login);

program
	.command('up [src_folder]')
	.alias('upload')
	.description(
		'load the [src_folder] as a SvelteLab REPL, defaults to the current folder, it need to be logged in',
	)
	.action((src_folder: string) => load(src_folder));

program.parse();
