import {
	cancel,
	intro,
	outro,
	password,
	select,
	spinner,
	text,
} from '@clack/prompts';
import { writeFile } from 'node:fs/promises';
import { RequestListener, createServer } from 'node:http';
import open from 'open';
import Pocketbase, { AuthMethodsList } from 'pocketbase';
import { BASE_URL, POCKETBASE_URL } from '../env.js';
import {
	check_cancel,
	deferred_promise,
	get_appdata_path,
	str_to_ui8a,
	ui8a_to_str,
} from '../utils.js';

function start_server({
	abort_controller,
	port,
	retry = 0,
	handler,
}: {
	abort_controller: AbortController;
	port: number;
	retry?: number;
	handler: RequestListener;
}) {
	const finished = deferred_promise();
	const started = deferred_promise<number>();
	const server = createServer(handler);
	server.listen(port);
	server.on('error', async () => {
		let new_port = port + 1;
		if (retry >= 0) {
			new_port = await text({
				message:
					"I wasn't able to find a port to launch the authentication server...what port would you like me to use?",
				validate(value) {
					if (isNaN(parseInt(value)))
						return `Value must be a number!`;
				},
			}).then((value) => parseInt(value.toString()));
		}
		check_cancel(new_port, 'No port available.');
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
	const await_message = spinner();
	server.on('listening', () => {
		started.resolve(port);
		await_message.start(
			'Waiting for the authentication flow to continue...',
		);
	});
	abort_controller.signal.addEventListener('abort', () => {
		server.close();
		finished.resolve();
		await_message.stop('Auth code received!');
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
		handler: async (req, res) => {
			if (req.method === 'OPTIONS') {
				res.writeHead(200, 'OK', {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': '*',
				});
				res.end();
				return;
			} else if (req.method === 'POST') {
				let accumulator = '';
				req.on('data', (chunk) => {
					accumulator += ui8a_to_str(chunk);
				});
				req.on('end', () => {
					auth_request = JSON.parse(accumulator);
					abort_controller.abort();
				});
				res.writeHead(200);
				res.end();
				return;
			}
			res.writeHead(405);
			res.end();
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
		await writeFile(
			get_appdata_path('.sveltelab-login'),
			str_to_ui8a(pocketbase.authStore.exportToCookie()),
		);
		outro('Authenticated!');
		process.exit(0);
	}
}

async function login_with_mail(pocketbase: Pocketbase) {
	const email = await text({
		message: 'Email',
	});
	check_cancel(email);
	const pass = await password({
		message: 'Password',
		mask: '*',
	});
	check_cancel(pass);
	try {
		await pocketbase
			.collection('users')
			.authWithPassword(email.toString(), pass.toString());
		writeFile(
			get_appdata_path('.sveltelab-login'),
			str_to_ui8a(pocketbase.authStore.exportToCookie()),
		);
		outro('Authenticated!');
	} catch (_e) {
		cancel("Can't login with this credentials.");
	}
}
export async function login() {
	const pocketbase = new Pocketbase(POCKETBASE_URL);
	const auth_methods = await pocketbase.collection('users').listAuthMethods();
	intro('Welcome to SvelteLab, ready to login?');
	if (auth_methods.emailPassword) {
		const login_choice = await select({
			message: 'How do you want to login?',
			initialValue: 'github',
			options: [
				{
					label: 'email+password',
					value: 'email',
				},
				{
					label: 'github',
					value: 'github',
				},
			],
		});
		check_cancel(login_choice);
		if (login_choice === 'github') {
			await login_with_github(auth_methods, pocketbase);
		} else {
			await login_with_mail(pocketbase);
		}
		return;
	}
	await login_with_github(auth_methods, pocketbase);
}
