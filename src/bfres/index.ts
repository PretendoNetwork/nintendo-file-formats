import type FileStream from '@/file-stream';
import type { IndexGroup, IndexGroupEntry } from '@/bfres/bfres';

// * I *REALLY* hate that this is here, it's SO HACKY. But multiple BFRES subfile types
// * need to parse index groups, and this was the easiest way I could think to do it without
// * having to drill the BFRES reference all the way through the chain and without duplicating
// * all this logic in multiple classes
export function parseIndexGroup(stream: FileStream): IndexGroup {
	const groupLength = stream.readUInt32();
	const entryCount = stream.readInt32();
	const entries: IndexGroupEntry[] = [];

	for (let i = 0; i < entryCount + 1; i++) {
		const searchValue = stream.readUInt32();
		const leftIndex = stream.readUInt16();
		const rightIndex = stream.readUInt16();
		const namePointer = stream.tell() + stream.readInt32();
		const dataPointer = stream.readInt32(); // * Unlike other offsets, this one already seems to be relative to the start of the file? Even though it's not documented as such?

		const name = parseStringTableString(stream, namePointer);
		const actualDataPointer = dataPointer !== 0 ? dataPointer + stream.tell() - 4 : 0;

		entries.push({
			isRoot: i === 0,
			searchValue,
			leftIndex,
			rightIndex,
			namePointer,
			dataPointer: actualDataPointer,
			name
		});
	}

	return {
		length: groupLength,
		entryCount,
		entries
	};
}

// * I *REALLY* hate that this is here, it's SO HACKY. But multiple BFRES subfile types
// * need to parse strings, and this was the easiest way I could think to do it without
// * having to drill the BFRES reference all the way through the chain and without duplicating
// * all this logic in multiple classes
export function parseStringTableString(stream: FileStream, offset: number): string {
	const stringTable =stream.metadata['bfres-string-table'] as { offset: number; value: string; }[];

	let name = '';
	if (offset !== 0) {
		const stringEntry = stringTable.find(entry => entry.offset === offset);
		if (stringEntry) {
			name = stringEntry.value;
		}
	}

	return name;
}

export { default as BFRES, default } from '@/bfres/bfres';
export * from '@/bfres/bfres';