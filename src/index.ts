#!/usr/bin/node
import { save } from './commands/save.ts';
import { Command } from './deps/commander.ts';
import { isDeno, isNode } from './deps/which_runtime.ts';
const program = new Command('SvelteLab CLI');

program
	.command('save <url> [destination]')
	.action((url: string, destination: string) => {
		save(url, destination);
	});

program.command('load').action(() => {});

if (isDeno) {
	program.parse(Deno.args);
} else if (isNode) {
	program.parse();
}

export { save };
