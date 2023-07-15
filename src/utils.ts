export function str_to_ui8a(str: string) {
	return new TextEncoder().encode(str);
}

export function ui8a_to_str(ui8a: Uint8Array) {
	return new TextDecoder().decode(ui8a);
}
