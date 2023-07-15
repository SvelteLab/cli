export type File = { file: { contents: Uint8Array } };

export type PocketbaseFile = {
	file: { contents: { buffer: number[]; kind: string } };
};

export type Directory<TFile = File> = {
	directory: {
		[filename: string]: TFile | Directory<TFile>;
	};
};
