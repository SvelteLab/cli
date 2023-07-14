import { Poketbase } from '../deps/pocketbase.ts';
import { POKETBASE_URL } from '../env.ts';

export async function load() {
	try {
		const login = await Deno.readTextFile('.sveltelab-login');
		let token = login;
		try {
			const email_and_password = JSON.parse(login);
			const pocketbase = new Poketbase(POKETBASE_URL);
			try {
				const result = await pocketbase
					.collection('users')
					.authWithPassword(
						email_and_password.email,
						email_and_password.password,
					);
				token = result.token;
			} catch (e) {
				/* empty */
			}
		} catch (e) {
			/** */
		}
		console.log(token);
	} catch (e) {
		console.log('You are not logged in, try run `sveltelab login` first');
	}
}
