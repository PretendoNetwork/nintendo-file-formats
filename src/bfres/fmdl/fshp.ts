import FileStream from '@/file-stream';
import { parseStringTableString } from '@/bfres';

const FSHP_MAGIC = Buffer.from('FSHP');

// * Stolen from https://pastebin.com/DCrP1w9x because lazy
export enum GX2PrimitiveType {
    GX2_PRIMITIVE_POINTS = 0x01,
    GX2_PRIMITIVE_LINES = 0x02,
    GX2_PRIMITIVE_LINE_STRIP = 0x03,
    GX2_PRIMITIVE_TRIANGLES = 0x04,
    GX2_PRIMITIVE_TRIANGLE_FAN = 0x05,
    GX2_PRIMITIVE_TRIANGLE_STRIP = 0x06,
    GX2_PRIMITIVE_LINES_ADJACENCY = 0x0a,
    GX2_PRIMITIVE_LINE_STRIP_ADJACENCY = 0x0b,
    GX2_PRIMITIVE_TRIANGLES_ADJACENCY = 0x0c,
    GX2_PRIMITIVE_TRIANGLE_STRIP_ADJACENCY = 0x0d,
    GX2_PRIMITIVE_RECTS = 0x11,
    GX2_PRIMITIVE_LINE_LOOP = 0x12,
    GX2_PRIMITIVE_QUADS = 0x13,
    GX2_PRIMITIVE_QUAD_STRIP = 0x14,
    GX2_PRIMITIVE_TESSELLATE_LINES = 0x82,
    GX2_PRIMITIVE_TESSELLATE_LINE_STRIP = 0x83,
    GX2_PRIMITIVE_TESSELLATE_TRIANGLES = 0x84,
    GX2_PRIMITIVE_TESSELLATE_TRIANGLE_STRIP = 0x86,
    GX2_PRIMITIVE_TESSELLATE_QUADS = 0x93,
    GX2_PRIMITIVE_TESSELLATE_QUAD_STRIP = 0x94
}

// * Stolen from https://pastebin.com/DCrP1w9x because lazy
export enum GX2IndexFormat {
    GX2_INDEX_FORMAT_U16_LE = 0,
    GX2_INDEX_FORMAT_U32_LE = 1,
    GX2_INDEX_FORMAT_U16 = 4,
    GX2_INDEX_FORMAT_U32 = 9
}

export type FSHP_LOD_MODEL = {
	type: GX2PrimitiveType;
	indexFormat: GX2IndexFormat;
	drawnPointsCount: number;
	visibilityGroupCount: number;
	visibilityGroupOffset: number;
	indexBufferOffset: number;
	skippedVerticesCount: number;
};

export default class FSHP {
	private stream: FileStream;

	public polygonNameOffset: number;
	public polygonName: string;
	public flags: number;
	public sectionIndex: number;
	public materialIndex: number;
	public skeletonIndex: number;
	public vertexIndex: number;
	public skeletonBoneIndex: number;
	public vertexSkinCount: number;
	public levelOfDetailModelCount: number;
	public keyShapeCount: number;
	public targetAttributeCount: number;
	public visibilityGroupTreeNodeCount: number;
	public boundingBoxRadius: number;
	public vertexBufferOffset: number;
	public levelOfDetailModelOffset: number;
	public skeletonIndexArrayOffset: number;
	public keyShapeIndexOffset: number;
	public visibilityGroupTreeNodesOffset: number;
	public visibilityGroupTreeRangesOffset: number;
	public visibilityGroupTreeIndicesOffset: number;
	public levelOfDetailModels: FSHP_LOD_MODEL[] = [];

	/**
	 * Parses the FSHP from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `FSHP` and
	 * parses the FSHP from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): FSHP {
		const fshp = new FSHP();
		fshp.parseFromFileStream(stream);

		return fshp;
	}

	/**
	 * Parses the FSHP from the input source provided at instantiation
	 */
	public parse(): void {
		this.stream.consumeAll();

		const magic = this.stream.readBytes(0x4);

		if (!FSHP_MAGIC.equals(magic)) {
			throw new Error('Invalid FSHP magic');
		}

		this.polygonNameOffset = this.stream.tell() + this.stream.readInt32();
		this.flags = this.stream.readUInt32();
		this.sectionIndex = this.stream.readUInt16();
		this.materialIndex = this.stream.readUInt16();
		this.skeletonIndex = this.stream.readUInt16();
		this.vertexIndex = this.stream.readUInt16();
		this.skeletonBoneIndex = this.stream.readUInt16();
		this.vertexSkinCount = this.stream.readUInt8();
		this.levelOfDetailModelCount = this.stream.readUInt8();
		this.keyShapeCount = this.stream.readUInt8();
		this.targetAttributeCount = this.stream.readUInt8();
		this.visibilityGroupTreeNodeCount = this.stream.readUInt16();
		this.boundingBoxRadius = this.stream.readFloat();
		this.vertexBufferOffset = this.stream.tell() + this.stream.readInt32();
		this.levelOfDetailModelOffset = this.stream.readInt32();
		this.skeletonIndexArrayOffset = this.stream.tell() + this.stream.readInt32();
		this.keyShapeIndexOffset = this.stream.tell() + this.stream.readInt32();
		this.visibilityGroupTreeNodesOffset = this.stream.tell() + this.stream.readInt32();
		this.visibilityGroupTreeRangesOffset = this.stream.tell() + this.stream.readInt32();
		this.visibilityGroupTreeIndicesOffset = this.stream.tell() + this.stream.readInt32();

		this.stream.skip(0x4); // * User pointer

		this.polygonName = parseStringTableString(this.stream, this.polygonNameOffset);
		this.parseLoDModels();
		this.parseKeyShapes();
		this.parseTargetAttributes();
	}

	private parseLoDModels(): void {
		this.stream.seek(this.levelOfDetailModelOffset);

		for (let i = 0; i < this.levelOfDetailModelCount; i++) {
			const type = this.stream.readUInt32();
			const indexFormat = this.stream.readUInt32();
			const drawnPointsCount = this.stream.readUInt32();
			const visibilityGroupCount = this.stream.readUInt16();

			this.stream.skip(0x2); // * Padding

			const visibilityGroupOffset = this.stream.tell() + this.stream.readInt32();
			const indexBufferOffset = this.stream.tell() + this.stream.readInt32();
			const skippedVerticesCount = this.stream.readUInt32();

			this.levelOfDetailModels.push({
				type: type,
				indexFormat: indexFormat,
				drawnPointsCount: drawnPointsCount,
				visibilityGroupCount: visibilityGroupCount,
				visibilityGroupOffset: visibilityGroupOffset,
				indexBufferOffset: indexBufferOffset,
				skippedVerticesCount: skippedVerticesCount
			});
		}
	}

	private parseKeyShapes(): void {
		// * https://mk8.tockdom.com/wiki/FMDL_(File_Format) doesn't document this
	}

	private parseTargetAttributes(): void {
		// * https://mk8.tockdom.com/wiki/FMDL_(File_Format) doesn't document this
	}
}