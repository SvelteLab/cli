export async function save(url: string, destination: string) {
	const actual_url = new URL(url);
	const is_correct_url = ['sveltelab.dev', 'www.sveltelab.dev'].includes(
		actual_url.hostname,
	);
	if (!is_correct_url) {
		throw new Error('Invalid URL: it must be a sveltelab project');
	}
	const project = await fetch(actual_url).then((res) => res.text());
	const ui8a = new Uint8Array([...project].map((char) => char.charCodeAt(0)));
	try {
		await Deno.mkdir(destination, { recursive: true });
	} catch (_e) {
		await Deno.remove(destination, { recursive: true });
		await Deno.mkdir(destination, { recursive: true });
	}
	await Deno.writeFile(`${destination}/file`, ui8a, {
		create: true,
	});
}
