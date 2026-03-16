import FileStream from '@/file-stream';
import { parseStringTableString } from '@/bfres';
import type { FVTX_BUFFER } from '@/bfres/fmdl/fvtx';

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
	primitiveType: GX2PrimitiveType;
	indexFormat: GX2IndexFormat;
	maxDrawnPointsCount: number;
	visibilityGroupCount: number;
	visibilityGroupOffset: number;
	indexBufferOffset: number;
	skippedVerticesCount: number;
	indexBuffer: FVTX_BUFFER;
	visibilityGroups: FSHP_VISIBILITY_GROUP[];
	indices: number[];
};

export type FSHP_VISIBILITY_GROUP = {
	indexBufferOffset: number;
	drawnPointsCount: number;
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
		this.levelOfDetailModelOffset = this.stream.tell() + this.stream.readInt32();
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
		for (let i = 0; i < this.levelOfDetailModelCount; i++) {
			this.stream.seek(this.levelOfDetailModelOffset + (0x1C * i));

			const primitiveType = this.stream.readUInt32();
			const indexFormat = this.stream.readUInt32();
			const maxDrawnPointsCount = this.stream.readUInt32();
			const visibilityGroupCount = this.stream.readUInt16();

			this.stream.skip(0x2); // * Padding

			const visibilityGroupOffset = this.stream.tell() + this.stream.readInt32();
			const indexBufferOffset = this.stream.tell() + this.stream.readInt32();
			const skippedVerticesCount = this.stream.readUInt32();

			this.stream.seek(indexBufferOffset);

			const indexBufferDataPointer = this.stream.readUInt32();
			const indexBufferSize = this.stream.readUInt32();
			const indexBufferBufferHandle = this.stream.readUInt32();
			const indexBufferStride = this.stream.readUInt16();
			const indexBufferBufferingCount = this.stream.readUInt16();
			const indexBufferContextPointer = this.stream.readUInt32();
			const indexBufferDataOffset = this.stream.tell() + this.stream.readInt32();

			this.stream.seek(indexBufferDataOffset);

			const indexBufferData = this.stream.read(indexBufferSize);

			const indexBuffer: FVTX_BUFFER = {
				dataPointer: indexBufferDataPointer,
				size: indexBufferSize,
				bufferHandle: indexBufferBufferHandle,
				stride: indexBufferStride,
				bufferingCount: indexBufferBufferingCount,
				contextPointer: indexBufferContextPointer,
				dataOffset: indexBufferDataOffset,
				data: indexBufferData
			};

			const visibilityGroups: FSHP_VISIBILITY_GROUP[] = [];

			for (let j = 0; j < visibilityGroupCount; j++) {
				this.stream.seek(visibilityGroupOffset + (0x08 * j));

				visibilityGroups.push({
					indexBufferOffset: this.stream.readUInt32(),
					drawnPointsCount: this.stream.readUInt32()
				});
			}

			const indices: number[] = [];

			// TODO - This is mostly a hack, ideally this would be done with "this.stream"
			if (indexFormat === GX2IndexFormat.GX2_INDEX_FORMAT_U16_LE) {
				for (let i = 2 * skippedVerticesCount; i < indexBufferData.length; i += 2) {
					indices.push(indexBufferData.readUInt16LE(i));
				}
			} else if (indexFormat === GX2IndexFormat.GX2_INDEX_FORMAT_U32_LE) {
				for (let i = 4 * skippedVerticesCount; i < indexBufferData.length; i += 4) {
					indices.push(indexBufferData.readUInt32LE(i));
				}
			} else if (indexFormat === GX2IndexFormat.GX2_INDEX_FORMAT_U16) {
				// TODO - This should use the streams endianness I think?
				for (let i = 2 * skippedVerticesCount; i < indexBufferData.length; i += 2) {
					indices.push(indexBufferData.readUInt16BE(i));
				}
			} else if (indexFormat === GX2IndexFormat.GX2_INDEX_FORMAT_U32) {
				// TODO - This should use the streams endianness I think?
				for (let i = 4 * skippedVerticesCount; i < indexBufferData.length; i += 4) {
					indices.push(indexBufferData.readUInt32BE(i));
				}
			}

			this.levelOfDetailModels.push({
				primitiveType: primitiveType,
				indexFormat: indexFormat,
				maxDrawnPointsCount: maxDrawnPointsCount,
				visibilityGroupCount: visibilityGroupCount,
				visibilityGroupOffset: visibilityGroupOffset,
				indexBufferOffset: indexBufferOffset,
				skippedVerticesCount: skippedVerticesCount,
				indexBuffer: indexBuffer,
				visibilityGroups: visibilityGroups,
				indices
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