#!/usr/bin/node
import { save } from './commands/save.ts';
import { Command } from './deps/commander.ts';
const program = new Command('SvelteLab CLI');

program
	.command('save <url> [destination]')
	.action((url: string, destination: string) => {
		save(url, destination);
	});

program.command('load').action(() => {});

program.parse();

export { save };
