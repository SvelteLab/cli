type File = { file: { contents: Uint8Array } };

type Directory = {
	directory: {
		[filename: string]: File | Directory;
	};
};

function get_files(project: any) {
	let retval: Directory = { directory: {} };
	for (let file_name in project) {
		const file = project[file_name];
		if ('directory' in file) {
			retval.directory[file_name] = get_files(file.directory);
		} else {
			console.log(file_name, file);
			retval.directory[file_name] = {
				file: { contents: new Uint8Array(file.file.contents.buffer) },
			};
		}
	}
	return retval;
}

async function write_files(files: Directory, base_path: string) {
	for (let file_name in files.directory) {
		const file = files.directory[file_name];
		if ('directory' in file) {
			try {
				await Deno.mkdir(`${base_path}/${file_name}`, {
					recursive: true,
				});
			} catch (_e) {
				await Deno.remove(`${base_path}/${file_name}`, {
					recursive: true,
				});
				await Deno.mkdir(`${base_path}/${file_name}`, {
					recursive: true,
				});
			}
			write_files(file, `${base_path}/${file_name}`);
		} else {
			await Deno.writeFile(
				`${base_path}/${file_name}`,
				file.file.contents,
				{
					create: true,
				},
			);
		}
	}
}

export async function save(url: string, destination: string) {
	const actual_url = new URL(`${url}.json`);
	const is_correct_url = [
		'sveltelab.dev',
		'www.sveltelab.dev',
		'localhost',
	].includes(actual_url.hostname);
	if (!is_correct_url) {
		throw new Error('Invalid URL: it must be a sveltelab project');
	}
	const project = await fetch(actual_url).then((res) => res.json());
	try {
		await Deno.mkdir(destination, { recursive: true });
	} catch (_e) {
		await Deno.remove(destination, { recursive: true });
		await Deno.mkdir(destination, { recursive: true });
	}
	const files = get_files(project.files);

	await write_files(files, destination);
}
