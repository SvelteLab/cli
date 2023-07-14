import { build, emptyDir } from 'https://deno.land/x/dnt@0.37.0/mod.ts';
import { DEV } from '../src/env.ts';

const outDir = './build/npm';

await emptyDir(outDir);

let [version, dev_mode] = Deno.args;

if (DEV && dev_mode !== '-d') {
	throw new Error('You forgot to turn off dev mode!');
}
if (!version) {
	throw new Error('a version argument is required to build the npm package');
}
version = version.replace(/^v/, '');
await build({
	entryPoints: [
		{
			kind: 'bin',
			name: 'sveltelab',
			path: './src/index.ts',
		},
		'./mod.ts',
	],
	scriptModule: false,
	outDir,
	shims: {
		deno: true,
		undici: true,
		prompts: true,
	},
	test: false,
	typeCheck: false,
	compilerOptions: {
		target: 'ES2020',
		sourceMap: true,
	},
	package: {
		// package.json properties
		name: 'sveltelab',
		version,
		description:
			'SvelteLab CLI, to interact with sveltelab from your terminal',
		license: 'MIT',
		repository: {
			type: 'git',
			url: 'git+https://github.com/sveltelab/cli.git',
		},
		bugs: {
			url: 'https://github.com/sveltelab/cli/issues',
		},
	},
});

await Deno.copyFile('README.md', `${outDir}/README.md`);
