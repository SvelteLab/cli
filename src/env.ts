const DEV = false;

const VALID_HOSTNAMES = DEV
	? ['localhost', 'sveltelab.dev', 'www.sveltelab.dev']
	: ['sveltelab.dev', 'www.sveltelab.dev'];

const BASE_URL = DEV ? 'http://localhost:5173' : 'https://sveltelab.dev';
const POCKETBASE_URL = DEV
	? 'https://sveltelab-dev.pockethost.io'
	: 'https://sveltelab.fly.dev';
export { DEV, VALID_HOSTNAMES, BASE_URL, POCKETBASE_URL };
