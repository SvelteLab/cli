import { Poketbase } from '../deps/pocketbase.ts';
import { BASE_URL, POKETBASE_URL } from '../env.ts';

export async function load() {
	try {
		const token = await Deno.readTextFile('.sveltelab-login');
		const pocketbase = new Poketbase(POKETBASE_URL);
		pocketbase.authStore.loadFromCookie(token);
		try {
			const created = await pocketbase.collection('repls').create({
				files: { test: { file: { contents: 'test' } } },
				name: 'test',
				user: pocketbase.authStore.model?.id,
			});
			console.log(`New REPL created ${BASE_URL}/${created.id}`);
		} catch (_e) {
			console.log(_e);
		}
	} catch (_e) {
		console.log('You are not logged in, try run `sveltelab login` first');
	}
}
