import FileStream from '@/file-stream';
import { parseIndexGroup } from '@/bfres';
import FMDL from '@/bfres/fmdl';

const BFRES_MAGIC = Buffer.from('FRES');
const BIG_ENDIAN = Buffer.from('FEFF', 'hex');
const LITTLE_ENDIAN = Buffer.from('FFFE', 'hex');

export interface IndexGroup {
	length: number;
	entryCount: number;
	entries: IndexGroupEntry[];
}

export interface IndexGroupEntry {
	isRoot: boolean;
	searchValue: number;
	leftIndex: number;
	rightIndex: number;
	namePointer: number;
	dataPointer: number;
	name: string;
}

export default class BFRES {
	private stream: FileStream;

	public version: string;
	public stringTableLength: number;
	public stringTableOffset: number;
	public indexGroupOffets: number[] = [];
	public fileCounts: number[] = [];
	public stringTable: { offset: number; value: string; }[] = [];
	public indexGroups: (IndexGroup | null)[] = [];
	public models: FMDL[] = [];

	/**
	 * Parses the BFRES from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public parseFromFile(fdOrPath: number | string): void {
		this.stream = new FileStream(fdOrPath);
		this.parse();
	}

	/**
	 * Parses the BFRES from the provided `buffer`
	 *
	 * @param buffer - BFRES data buffer
	 */
	public parseFromBuffer(buffer: Buffer): void {
		this.stream = new FileStream(buffer);
		this.parse();
	}

	/**
	 * Parses the BFRES from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded BFRES data
	 */
	public parseFromString(base64: string): void {
		this.parseFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Parses the BFRES from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `BFRES` and
	 * parses the BFRES from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public static fromFile(fdOrPath: number | string): BFRES {
		const bfres = new BFRES();
		bfres.parseFromFile(fdOrPath);

		return bfres;
	}

	/**
	 * Creates a new instance of `BFRES` and
	 * parses the BFRES from the provided `buffer`
	 *
	 * @param buffer - BFRES data buffer
	 */
	public static fromBuffer(buffer: Buffer): BFRES {
		const bfres = new BFRES();
		bfres.parseFromBuffer(buffer);

		return bfres;
	}

	/**
	 * Creates a new instance of `BFRES` and
	 * parses the BFRES from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded BFRES data
	 */
	public static fromString(base64: string): BFRES {
		const bfres = new BFRES();
		bfres.parseFromString(base64);

		return bfres;
	}

	/**
	 * Creates a new instance of `BFRES` and
	 * parses the BFRES from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): BFRES {
		const bfres = new BFRES();
		bfres.parseFromFileStream(stream);

		return bfres;
	}

	/**
	 * Parses the BFRES from the input source provided at instantiation
	 */
	public parse(): void {
		this.stream.consumeAll(); // * Read the whole file into memory since we need to jump around a lot

		const magic = this.stream.readBytes(0x4);

		if (!BFRES_MAGIC.equals(magic)) {
			throw new Error('Invalid BFRES magic');
		}

		const versionMajor = this.stream.readUInt8();
		const versionMinor = this.stream.readUInt8();
		const versionPatch = this.stream.readUInt8();
		const versionPre = this.stream.readUInt8();

		this.version = `${versionMajor}.${versionMinor}.${versionPatch}.${versionPre}`;
		this.stream.metadata['bfres-version'] = this.version; // * Subfiles have differing behavior based on the BFRES version

		const bom = this.stream.readBytes(0x2);

		if (!LITTLE_ENDIAN.equals(bom) && !BIG_ENDIAN.equals(bom)) {
			throw new Error('Invalid BOM indicator');
		}

		if (BIG_ENDIAN.equals(bom)) {
			this.stream.bom = 'be';
		}

		const headerLength = this.stream.readUInt16();

		if (headerLength !== 0x10) {
			throw new Error(`Invalid header length. Expected ${0x10}, got ${headerLength}`);
		}

		this.stream.skip(0x4); // * Total BFRES file size
		this.stream.skip(0x4); // * Alignment
		this.stream.skip(0x4); // * File name offset

		this.stringTableLength = this.stream.readInt32();
		this.stringTableOffset = this.stream.tell() + this.stream.readInt32(); // TODO - Offsets are relative to themselves. This pattern shows up A LOT. Move this to the Stream class?

		for (let i = 0; i < 12; i++) {
			const offsetBase = 0x20 + (i * 4);
			const relativeOffset = this.stream.readInt32();

			if (relativeOffset === 0) {
				// * 0 indicates this subfile type is not present
				this.indexGroupOffets.push(0);
			} else {
				this.indexGroupOffets.push(relativeOffset + offsetBase);
			}
		}

		for (let i = 0; i < 12; i++) {
			this.fileCounts.push(this.stream.readUInt16());
		}

		this.parseStringTable();
		this.parseIndexGroups();

		for (const indexGroup of this.indexGroups) {
			if (!indexGroup) {
				continue;
			}

			for (const entry of indexGroup.entries) {
				if (entry.isRoot) {
					continue;
				}

				this.stream.seek(entry.dataPointer);

				// TODO - This is a hack and will break on emebdded files (group 11) since they can be ANY data, and may not have a 4 byte magic
				const magic = this.stream.readBytes(0x4).toString();
				this.stream.skip(-0x4); // * Put it back so the subfile reads correctly

				switch (magic) {
					case 'FMDL':
						this.models.push(FMDL.fromFileStream(this.stream));
						break;
				}
			}
		}
	}

	public exportModelAsOBJ(modelName: string): string {
		const model = this.models.find(({ fileName }) => fileName === modelName);

		if (!model) {
			return '';
		}

		let obj = '# Exported from BFRES\n';
		obj += `# Model: ${modelName}\n\n`;

		for (const fvtx of model.vertexArray) {
			for (const vertex of fvtx.vertices) {
				if (vertex.position && Array.isArray(vertex.position)) {
					const [x, y, z] = vertex.position;
					obj += `v ${x} ${y} ${z}\n`;
				}
			}
		}

		for (const fvtx of model.vertexArray) {
			for (const vertex of fvtx.vertices) {
				if (vertex.normal && Array.isArray(vertex.normal)) {
					const [x, y, z] = vertex.normal;
					obj += `vn ${x} ${y} ${z}\n`;
				}
			}
		}

		for (const shape of model.shapes) {
			obj += `o ${shape.polygonName}\n`;

			if (shape.levelOfDetailModels.length > 0) {
				const lodModel = shape.levelOfDetailModels[0];
				const indices = lodModel.indices;

				for (let i = 0; i < indices.length; i += 3) {
					if (i + 2 < indices.length) {
						const idx1 = indices[i] + 1;
						const idx2 = indices[i + 1] + 1;
						const idx3 = indices[i + 2] + 1;

						obj += `f ${idx1}//${idx1} ${idx2}//${idx2} ${idx3}//${idx3}\n`;
					}
				}

				obj += '\n';
			}
		}

		return obj;
	}

	public exportModelAsGLB(modelName: string): Buffer {
		const model = this.models.find(({ fileName }) => fileName === modelName);

		// * https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification
		const glb = Buffer.from([
			0x67, 0x6C, 0x54, 0x46, // * ASCII string "glTF"
			0x02, 0x00, 0x00, 0x00, // * Version 2
			0x0C, 0x00, 0x00, 0x00  // * Length, including the header. 12 for now because that's how long the header is
		]);

		if (!model) {
			return glb;
		}

		// TODO - Actually fill this
		// TODO - Make this function accept some settings to set custom skeletons/animations? Arian mentioned that Miis have a separate BFRES file for animations

		return glb;
	}

	private parseStringTable(): void {
		this.stream.seek(this.stringTableOffset);

		// * References to strings are offsets to this table, so pre-parse it
		// * to reduce seeks
		while (this.stream.tell() !== this.stringTableOffset+this.stringTableLength) {
			const offset = this.stream.tell() + 4; // * References are offset to the string directly, not including the length header
			const stringLength = this.stream.readUInt32();
			const string = this.stream.readBytes(stringLength).toString();

			this.stream.skip(1); // * Null byte
			this.stream.alignBlock(4);

			this.stringTable.push({
				offset: offset,
				value: string
			});
		}

		// * Subfiles need access to this
		this.stream.metadata['bfres-string-table'] = this.stringTable;
	}

	private parseIndexGroups(): void {
		for (const indexGroupOffset of this.indexGroupOffets) {
			if (indexGroupOffset === 0) {
				this.indexGroups.push(null);
				continue;
			}

			this.stream.seek(indexGroupOffset);
			this.indexGroups.push(parseIndexGroup(this.stream));
		}
	}
}