import { save } from './commands/save.ts';
import { Command } from './deps/commander.ts';

const program = new Command('SvelteLab CLI');

program
	.command('save <url> [destination]')
	.description(
		'save a SvelteLab REPL specified by <url> to the [destination] folder',
	)
	.action((url: string, destination: string) => {
		save(url, destination);
	});

program.command('load').action(() => {});

program.parse(Deno.args);

export { save };
