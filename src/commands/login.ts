import { open } from '../deps/open.ts';
import { serve, Handler } from '../deps/http.ts';
import { Select, Input, Secret, Number } from '../deps/cliffy.ts';
import { Pocketbase, AuthMethodsList } from '../deps/pocketbase.ts';
import { BASE_URL, POCKETBASE_URL } from '../env.ts';
import { deferred_promise, get_appdata_path, str_to_ui8a } from '../utils.ts';

function start_server({
	abort_controller,
	port,
	retry = 0,
	handler,
}: {
	abort_controller: AbortController;
	port: number;
	retry?: number;
	handler: Handler;
}) {
	const finished = deferred_promise();
	const started = deferred_promise<number>();
	serve(handler, {
		port,
		signal: abort_controller.signal,
		onListen() {
			started.resolve(port);
			console.log('Waiting for the authentication flow to continue...');
		},
	})
		.then(() => {
			finished.resolve();
		})
		.catch(async () => {
			let new_port = port + 1;
			if (retry >= 10) {
				new_port = await Number.prompt({
					message:
						"I wasn't able to find a port to launch the authentication server...what port would you like me to use?",
				});
			}
			const new_server = start_server({
				abort_controller,
				port: new_port,
				retry: retry + 1,
				handler,
			});
			new_server.finished.promise.then(() => {
				finished.resolve();
			});
			new_server.started.promise.then((port) => {
				started.resolve(port);
			});
		});
	return {
		finished,
		started,
	};
}

async function login_with_github(
	auth_methods: AuthMethodsList,
	pocketbase: Pocketbase,
) {
	const abort_controller = new AbortController();
	let port = 8000;
	const github_login = auth_methods.authProviders.find(
		(p) => p.name === 'github',
	);
	let auth_request: unknown;
	const server = start_server({
		port,
		abort_controller,
		handler: async (req) => {
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
				try {
					return new Response(null, {
						status: 200,
					});
				} finally {
					abort_controller.abort();
				}
			}
			return new Response(null, {
				status: 405,
			});
		},
	});
	port = await server.started.promise;
	const REDIRECT_URI = `${BASE_URL}/redirect/?port=${port}`;
	open(`${github_login?.authUrl}${REDIRECT_URI}`);
	await server.finished.promise;
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

async function login_with_mail(pocketbase: Pocketbase) {
	const email = await Input.prompt({
		message: 'Email',
	});
	const password = await Secret.prompt({
		message: 'Password',
	});
	try {
		await pocketbase.collection('users').authWithPassword(email, password);
		Deno.writeFile(
			get_appdata_path('.sveltelab-login'),
			str_to_ui8a(pocketbase.authStore.exportToCookie()),
		);
		console.log('Authenticated!');
	} catch (_e) {
		console.log("Can't login with this credentials.");
	}
}
export async function login() {
	const pocketbase = new Pocketbase(POCKETBASE_URL);
	const auth_methods = await pocketbase.collection('users').listAuthMethods();
	if (!auth_methods.emailPassword) {
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
