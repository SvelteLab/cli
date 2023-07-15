import { Pocketbase } from '../deps/pocketbase.ts';
import { BASE_URL, POCKETBASE_URL } from '../env.ts';
import { Directory, PocketbaseFile } from '../types.ts';
import { UINT8KIND, is_less_than_4mb } from '../utils.ts';
import { parse } from '../deps/path.ts';

async function get_src_folder_as_webcontainer(src_folder: string) {
	const dir = await Deno.readDir(src_folder);
	const webcontainer_files: Record<
		string,
		Directory<PocketbaseFile> | PocketbaseFile
	> = {};
	for await (const file of dir) {
		if (file.isFile) {
			const ui8a_file = await Deno.readFile(`${src_folder}/${file.name}`);
			webcontainer_files[file.name] = {
				file: {
					contents: { kind: UINT8KIND, buffer: [...ui8a_file] },
				},
			};
		} else if (file.isDirectory) {
			webcontainer_files[file.name] = {
				directory: await get_src_folder_as_webcontainer(
					`${src_folder}/${file.name}`,
				),
			};
		}
	}
	return webcontainer_files;
}

export async function load(src_folder = '.') {
	try {
		const token = await Deno.readTextFile('.sveltelab-login');
		const pocketbase = new Pocketbase(POCKETBASE_URL);
		pocketbase.authStore.loadFromCookie(token);
		try {
			const files = await get_src_folder_as_webcontainer(src_folder);
			if (!is_less_than_4mb(files)) {
				console.log("You can't load more than 4mb project, sorry. :(");
				return;
			}
			const { name } = parse(src_folder);
			try {
				const created = await pocketbase.collection('repls').create({
					files,
					name,
					user: pocketbase.authStore.model?.id,
				});
				console.log(`New REPL created ${BASE_URL}/${created.id}`);
			} catch (e) {
				console.log(
					`I was unable to create the new REPL: ${
						e.message ?? 'unknown'
					}`,
				);
			}
		} catch (_e) {
			console.log(
				'I was unable to read all the files in [src_folder]...try again.',
			);
		}
	} catch (_e) {
		console.log('You are not logged in, try run `sveltelab login` first');
	}
}
