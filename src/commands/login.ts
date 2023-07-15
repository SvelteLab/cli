import { open } from '../deps/open.ts';
import { Select, Input, Secret, Number } from '../deps/cliffy.ts';
import { Poketbase, AuthMethodsList } from '../deps/pocketbase.ts';
import { BASE_URL, POKETBASE_URL } from '../env.ts';
import { str_to_ui8a } from '../utils.ts';

async function login_with_github(
	auth_methods: AuthMethodsList,
	pocketbase: Poketbase,
) {
	const abort_controller = new AbortController();
	let port = 8000;
	const github_login = auth_methods.authProviders.find(
		(p) => p.name === 'github',
	);
	let auth_request: unknown;
	let retry = 0;
	let server: Deno.Server | undefined;
	while (!server) {
		try {
			server = Deno.serve(
				{
					port,
					signal: abort_controller.signal,
					reusePort: true,
					onListen() {
						console.log(
							'Waiting for the authentication flow to continue...',
						);
					},
				},
				async (req) => {
					if (req.method === 'OPTIONS') {
						return new Response(null, {
							status: 200,
							headers: {
								'Access-Control-Allow-Origin': '*',
								'Access-Control-Allow-Headers': '*',
							},
						});
					} else if (req.method === 'POST') {
						auth_request = await req.json();
						abort_controller.abort();
					}
					return new Response(null, {
						status: 200,
					});
				},
			);
		} catch (_e) {
			retry++;
			if (retry >= 10) {
				port = await Number.prompt({
					message:
						"I wasn't able to find a port to launch the authentication server...what port would you like me to use?",
				});
			}
		}
	}
	if (!server) {
		console.log('I wasnt able to launch the server, try again...');
		return;
	}
	const REDIRECT_URI = `${BASE_URL}/redirect/?port=${port}`;
	open(`${github_login?.authUrl}${REDIRECT_URI}`);
	await server.finished;
	if (
		auth_request &&
		auth_request instanceof Object &&
		'code' in auth_request &&
		typeof auth_request.code === 'string'
	) {
		await pocketbase
			.collection('users')
			.authWithOAuth2Code(
				'github',
				auth_request.code,
				github_login?.codeVerifier ?? '',
				REDIRECT_URI,
			);
		Deno.writeFile(
			'.sveltelab-login',
			str_to_ui8a(pocketbase.authStore.exportToCookie()),
		);
		console.log('Authenticated!');
	}
}

async function login_with_mail(pocketbase: Poketbase) {
	const email = await Input.prompt({
		message: 'Email',
	});
	const password = await Secret.prompt({
		message: 'Password',
	});
	try {
		await pocketbase.collection('users').authWithPassword(email, password);
		Deno.writeFile(
			'.sveltelab-login',
			str_to_ui8a(pocketbase.authStore.exportToCookie()),
		);
		console.log('Authenticated!');
	} catch (_e) {
		console.log("Can't login with this credentials.");
	}
}

export async function login() {
	const pocketbase = new Poketbase(POKETBASE_URL);
	const auth_methods = await pocketbase.collection('users').listAuthMethods();
	if (auth_methods.emailPassword) {
		const login_choice = await Select.prompt({
			message: 'How do you want to login?',
			default: 'github',
			options: [
				{
					name: 'email+password',
					value: 'email',
				},
				{
					name: 'github',
					value: 'github',
				},
			],
		});
		if (login_choice === 'github') {
			await login_with_github(auth_methods, pocketbase);
		} else {
			await login_with_mail(pocketbase);
		}
		return;
	}
	await login_with_github(auth_methods, pocketbase);
}
