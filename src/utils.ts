import { join } from './deps/path.ts';

export function str_to_ui8a(str: string) {
	return new TextEncoder().encode(str);
}

export function ui8a_to_str(ui8a: Uint8Array) {
	return new TextDecoder().decode(ui8a);
}

export const UINT8KIND = 'sveltelab-ui8a';

export function stringify(to_parse: unknown) {
	return JSON.stringify(to_parse, (_key, value) => {
		if (value instanceof Uint8Array) {
			return {
				kind: UINT8KIND,
				buffer: Array.from(value),
			};
		}
		return value;
	});
}

export function is_less_than_4mb(obj: object) {
	const FOUR_MB_IN_BYTES = 4000000;
	return JSON.stringify(obj).length <= FOUR_MB_IN_BYTES;
}

export function deferred_promise<T = void>() {
	let resolve: (value: T | PromiseLike<T>) => void = () => {};
	let reject: (reason?: unknown) => void = () => {};
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return {
		resolve,
		reject,
		promise,
	};
}

export function get_appdata_path(filename?: string) {
	const appdata = Deno.env.get('APPDATA') ?? Deno.env.get('HOME');
	return join(appdata ?? '', filename ?? '');
}
