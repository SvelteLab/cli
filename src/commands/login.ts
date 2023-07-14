import { open } from '../deps/open.ts';
import { Select, Input, Secret, Number } from '../deps/cliffy.ts';
import { Poketbase, AuthMethodsList } from '../deps/pocketbase.ts';
import { BASE_URL, POKETBASE_URL } from '../env.ts';

async function login_with_github(auth_methods: AuthMethodsList) {
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
	open(
		`${github_login?.authUrl}${BASE_URL}/redirect/?port=${port}&cv=${github_login?.codeVerifier}`,
	);
	await server.finished;
	if (
		auth_request &&
		auth_request instanceof Object &&
		'token' in auth_request &&
		typeof auth_request.token === 'string'
	) {
		Deno.writeFile(
			'.sveltelab-login',
			new TextEncoder().encode(auth_request.token),
		);
		console.log('Authenticated!');
	}
}

async function login_with_mail() {
	const email = await Input.prompt({
		message: 'Email',
	});
	const password = await Secret.prompt({
		message: 'Password',
	});
	Deno.writeFile(
		'.sveltelab-login',
		new TextEncoder().encode(JSON.stringify({ email, password })),
	);
	console.log({ email, password });
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
			await login_with_github(auth_methods);
		} else {
			await login_with_mail();
		}
		return;
	}
	await login_with_github(auth_methods);
}
