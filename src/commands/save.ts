import { BASE_URL, VALID_HOSTNAMES } from '../env.js';
import { Directory } from '../types.js';
import { mkdir, rmdir, writeFile, stat } from 'node:fs/promises';

// deno-lint-ignore no-explicit-any
function get_files(project: any) {
	const retval: Directory = { directory: {} };
	for (const file_name in project) {
		const file = project[file_name];
		if ('directory' in file) {
			retval.directory[file_name] = get_files(file.directory);
		} else {
			// handle very old repls with files that are still strings
			if (typeof file.file.contents !== 'string') {
				retval.directory[file_name] = {
					file: {
						contents: new Uint8Array(file.file.contents.buffer),
					},
				};
			} else {
				retval.directory[file_name] = {
					file: {
						contents: new TextEncoder().encode(file.file.contents),
					},
				};
			}
		}
	}
	return retval;
}

async function write_files(files: Directory, base_path: string) {
	for (const file_name in files.directory) {
		const file = files.directory[file_name];
		if ('directory' in file) {
			try {
				await mkdir(`${base_path}/${file_name}`, {
					recursive: true,
				});
			} catch (_e) {
				await rmdir(`${base_path}/${file_name}`, {
					recursive: true,
				});
				await mkdir(`${base_path}/${file_name}`, {
					recursive: true,
				});
			}
			write_files(file, `${base_path}/${file_name}`);
		} else {
			try {
				await writeFile(
					`${base_path}/${file_name}`,
					file.file.contents,
				);
				console.log(
					`Writing "${base_path}/${file_name}" to the disk...`,
				);
			} catch (_e) {
				console.error(
					`Failed to write "${base_path}/${file_name}" to the disk...`,
				);
			}
		}
	}
}

export async function save(url: string, destination = '.') {
	let actual_url;
	try {
		actual_url = new URL(`${url}.json`);
	} catch (_e) {
		actual_url = new URL(`${BASE_URL}/${url}.json`);
	}
	const is_correct_url = VALID_HOSTNAMES.includes(actual_url.hostname);
	if (!is_correct_url) {
		console.log('Invalid URL: it must be a sveltelab project');
		return;
	}
	try {
		console.log('Fetching the REPL...');
		const project = await fetch(actual_url).then((res) => {
			if (!res.ok) throw new Error();
			return res.json();
		});
		let already_made_directory = false;
		try {
			const dir = await stat(destination);
			if (dir.isFile() || dir.isDirectory()) {
				const want_to_delete = confirm(
					`The destination ${
						dir.isFile()
							? "exist and it's a file"
							: 'folder already exist'
					}, do you want to delete it?`,
				);
				if (want_to_delete) {
					await rmdir(destination, { recursive: true });
					await mkdir(destination, { recursive: true });
					already_made_directory = true;
				} else if (dir.isFile()) {
					console.error('Abort saving...');
					return;
				}
			}
		} catch (_e) {
			/* empty */
		}
		if (!already_made_directory) {
			try {
				await mkdir(destination, { recursive: true });
			} catch (_e) {
				/* empty */
			}
		}
		const files = get_files(project.files);

		await write_files(files, destination);
	} catch (_e) {
		console.error("Can't fetch the REPL, please try again.");
	}
}
