#!/usr/bin/node
import { save } from './commands/save.ts';
import { login } from './commands/login.ts';
import { load } from './commands/load.ts';
import { Command } from './deps/commander.ts';
const program = new Command('SvelteLab CLI');

program
	.command('save <url_or_id> [destination]')
	.description(
		'save a sveltelab REPL in a local folder, you can either pass the id or the whole url and a destination folder',
	)
	.action((url_or_id: string, destination: string) => {
		save(url_or_id, destination);
	});

program
	.command('login')
	.description('log in sveltelab either with email and password or github')
	.action(login);

program
	.command('load')
	.description('Load a the current folder as a SvelteLab REPL')
	.action(load);

program.parse();
