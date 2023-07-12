#!/usr/bin/node
import { save } from './commands/save.ts';
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

program.parse();
