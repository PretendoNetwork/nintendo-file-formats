import FileStream from '@/file-stream';
import FSKL from '@/bfres/fmdl/fskl';
import FVTX from '@/bfres/fmdl/fvtx';
import FSHP from '@/bfres/fmdl/fshp';
import { parseIndexGroup, parseStringTableString } from '@/bfres/index';
import type { IndexGroup } from '@/bfres/index';

const FMDL_MAGIC = Buffer.from('FMDL');

export default class FMDL {
	private stream: FileStream;

	public fileNameOffset: number;
	public filePathOffset: number;
	public skeletonOffset: number;
	public vertexArrayOffset: number;
	public shapeIndexGroupOffset: number;
	public materialIndexGroupOffset: number;
	public userDataIndexGroupOffsetStart: number;
	public userDataIndexGroupOffset: number;
	public vertexArrayCount: number;
	public shapeCount: number;
	public materialCount: number;
	public userDataEntryCount: number;
	public verticesCount: number;
	public fileName: string;
	public filePath: string;
	public skeleton: FSKL;
	public vertexArray: FVTX[] = [];
	public shapeIndexGroup: IndexGroup;
	public materialIndexGroup: IndexGroup;
	public userDataIndexGroup: IndexGroup | null = null;
	public shapes: FSHP[] = [];

	/**
	 * Parses the FMDL from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `FMDL` and
	 * parses the FMDL from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): FMDL {
		const fmdl = new FMDL();
		fmdl.parseFromFileStream(stream);

		return fmdl;
	}

	/**
	 * Parses the FMDL from the input source provided at instantiation
	 */
	public parse(): void {
		this.stream.consumeAll();

		const magic = this.stream.readBytes(0x4);

		if (!FMDL_MAGIC.equals(magic)) {
			throw new Error('Invalid FMDL magic');
		}

		this.fileNameOffset = this.stream.tell() + this.stream.readInt32();
		this.filePathOffset = this.stream.tell() + this.stream.readInt32();
		this.skeletonOffset = this.stream.tell() + this.stream.readInt32();
		this.vertexArrayOffset = this.stream.tell() + this.stream.readInt32();
		this.shapeIndexGroupOffset = this.stream.tell() + this.stream.readInt32();
		this.materialIndexGroupOffset = this.stream.tell() + this.stream.readInt32();
		this.userDataIndexGroupOffsetStart = this.stream.tell(); // * The offset can be 0, so that needs to be preserved. Start offset can be added later
		this.userDataIndexGroupOffset = this.stream.readInt32();
		this.vertexArrayCount = this.stream.readUInt16();
		this.shapeCount = this.stream.readUInt16();
		this.materialCount = this.stream.readUInt16();
		this.userDataEntryCount = this.stream.readUInt16();
		this.verticesCount = this.stream.readUInt32();

		this.stream.skip(0x4); // * User pointer

		this.fileName = parseStringTableString(this.stream, this.fileNameOffset);
		this.filePath = parseStringTableString(this.stream, this.filePathOffset);

		this.parseSkeleton();
		this.parseVertexArray();
		this.parseShapeIndexGroup();
		this.parseMaterialIndexGroup();
		this.parseUserDataIndexGroup();
	}

	private parseSkeleton(): void {
		this.stream.seek(this.skeletonOffset);
		this.skeleton = FSKL.fromFileStream(this.stream);
	}

	private parseVertexArray(): void {
		this.stream.seek(this.vertexArrayOffset);
		for (let i = 0; i < this.vertexArrayCount; i++) {
			this.vertexArray.push(FVTX.fromFileStream(this.stream));

			// * This array only stores the headers. Parsing the file data
			// * moves the stream position, so we need to reset it here
			this.stream.seek(this.vertexArrayOffset + (0x20 * i));
		}
	}

	private parseShapeIndexGroup(): void {
		this.stream.seek(this.shapeIndexGroupOffset);
		this.shapeIndexGroup = parseIndexGroup(this.stream);

		for (const entry of this.shapeIndexGroup.entries) {
			if (entry.isRoot) {
				continue;
			}

			this.stream.seek(entry.dataPointer);
			this.shapes.push(FSHP.fromFileStream(this.stream));
		}
	}

	private parseMaterialIndexGroup(): void {
		this.stream.seek(this.materialIndexGroupOffset);
		this.materialIndexGroup = parseIndexGroup(this.stream);
	}

	private parseUserDataIndexGroup(): void {
		if (this.userDataIndexGroupOffset) {
			this.stream.seek(this.userDataIndexGroupOffsetStart + this.userDataIndexGroupOffset);
			this.userDataIndexGroup = parseIndexGroup(this.stream);
		}
	}
}