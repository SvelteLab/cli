import { save } from './commands/save.ts';
import { Command } from './deps.ts';

const program = new Command('SvelteLab CLI');

program.command('save <url> [destination]').action((url, destination) => {
	save(url, destination);
});

program.command('load').action(() => {});

program.parse(Deno.args);

export { save };
