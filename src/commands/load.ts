import Pocketbase from 'pocketbase';
import { BASE_URL, POCKETBASE_URL } from '../env.js';
import { Directory, PocketbaseFile } from '../types.js';
import {
	UINT8KIND,
	check_cancel,
	get_appdata_path,
	is_less_than_4mb,
} from '../utils.js';
import { parse } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { intro, cancel, text, outro } from '@clack/prompts';

const BLACKLIST = ['node_modules'];

async function get_src_folder_as_webcontainer(src_folder: string) {
	const dir = await readdir(src_folder, {
		withFileTypes: true,
	});
	const webcontainer_files: Record<
		string,
		Directory<PocketbaseFile> | PocketbaseFile
	> = {};
	for await (const file of dir) {
		if (BLACKLIST.includes(file.name)) continue;
		if (file.isFile()) {
			const ui8a_file = await readFile(`${src_folder}/${file.name}`);
			webcontainer_files[file.name] = {
				file: {
					contents: { kind: UINT8KIND, buffer: [...ui8a_file] },
				},
			};
		} else if (file.isDirectory()) {
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
	intro('Loading you Project in sveltelab...');
	try {
		const token = await readFile(get_appdata_path('.sveltelab-login'), {
			encoding: 'utf-8',
		});
		const pocketbase = new Pocketbase(POCKETBASE_URL);
		pocketbase.authStore.loadFromCookie(token);
		try {
			const files = await get_src_folder_as_webcontainer(src_folder);
			if (!is_less_than_4mb(files)) {
				cancel("You can't load more than 4mb project, sorry. :(");
				return;
			}
			const { name } = parse(src_folder);
			const actual_name = await text({
				message: 'How would you like to name your REPL?',
				initialValue: name,
			});
			check_cancel(actual_name);
			try {
				const created = await pocketbase.collection('repls').create({
					files,
					name: actual_name,
					user: pocketbase.authStore.model?.id,
				});
				outro(`New REPL created ${BASE_URL}/${created.id}`);
			} catch (e) {
				cancel(
					`I was unable to create the new REPL: ${
						(e as any).message ?? 'unknown'
					}`,
				);
			}
		} catch (_e) {
			cancel(
				'I was unable to read all the files in [src_folder]...try again.',
			);
		}
	} catch (_e) {
		cancel('You are not logged in, try run `sveltelab login` first');
	}
}
