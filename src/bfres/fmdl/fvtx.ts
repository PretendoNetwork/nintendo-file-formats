import FileStream from '@/file-stream';
import { parseIndexGroup, parseStringTableString } from '@/bfres';
import type { IndexGroup } from '@/bfres/bfres';
import type Vec2 from '@/types/vec2';
import type Vec3 from '@/types/vec3';
import type Vec4 from '@/types/vec4';

const FVTX_MAGIC = Buffer.from('FVTX');

export enum GX2AttribFormat {
	UNORM_8 = 0X0000,
	UNORM_8_8 = 0X0004,
	UNORM_16_16 = 0X0007,
	UNORM_8_8_8_8 = 0X000A,
	UINT_8 = 0X0100,
	UINT_8_8 = 0X0104,
	UINT_8_8_8_8 = 0X010A,
	SNORM_8 = 0X0200,
	SNORM_8_8 = 0X0204,
	SNORM_16_16 = 0X0207,
	SNORM_8_8_8_8 = 0X020A,
	SNORM_10_10_10_2 = 0X020B,
	SINT_8 = 0X0300,
	SINT_8_8 = 0X0304,
	SINT_8_8_8_8 = 0X030A,
	FLOAT_32 = 0X0806,
	FLOAT_16_16 = 0X0808,
	FLOAT_32_32 = 0X080D,
	FLOAT_16_16_16_16 = 0X080F,
	FLOAT_32_32_32 = 0X0811,
	FLOAT_32_32_32_32 = 0X0813
}

export type FVTX_ATTRIBUTE_NAME =
	| '_p0' // * position0 - The position of the vertex
	| '_n0' // * normal0 - The normal of the vertex used in lighting calculations
	| '_t0' // * tangent0 - The tangent of the vertex used in advanced lighting calculations
	| '_b0' // * binormal0 - The binormal of the vertex used in advanced lighting calculations
	| '_w0' // * blendweight0 - Influence amount of the smooth skinning matrix at the index given in blendindex0
	| '_i0' // * blendindex0 - Index of influencing smooth skinning matrix
	| '_u0' // * uv0 - Texture coordinates used for texture mapping
	| '_u1' // * uv1 - Texture coordinates used for texture mapping
	| '_u2' // * uv2 - Texture coordinates used for texture mapping
	| '_u3' // * uv3 - Texture coordinates used for texture mapping
	| '_c0' // * color0 - Vertex colors used for simple shadow mapping
	| '_c1' // * color1 - Vertex colors used for simple shadow mapping

export type FVTX_ATTRIBUTE_HEADER = {
	nameOffset: number;
	name: FVTX_ATTRIBUTE_NAME;
	bufferIndex: number;
	bufferOffset: number;
	format: GX2AttribFormat;
};

export type FVTX_BUFFER = {
	dataPointer: number;
	size: number;
	bufferHandle: number;
	stride: number;
	bufferingCount: number;
	contextPointer: number;
	dataOffset: number;
};

export type FVTX_VERTEX_ATTRIBUTE = {
	position?: Vec3 | Vec4; // * If Vec4, the 4th element is always 1.0
	normal?: Vec3 | Vec4; // * If Vec4, the 4th element is always 1.0
	tangent?: Vec3 | Vec4;
	binormal?: Vec3 | Vec4;
	blendweight?: number;
	blendindex?: number;
	uv0?: Vec2;
	uv1?: Vec2;
	uv2?: Vec2;
	uv3?: Vec2;
	color0?: Vec4;
	color1?: Vec4;
}

export default class FVTX {
	private stream: FileStream;

	public attributeCount: number;
	public bufferCount: number;
	public sectionIndex: number;
	public verticesCount: number;
	public vertexSkinCount: number;
	public attributeArrayOffset: number;
	public attributeIndexGroupOffset: number;
	public attributeIndexGroup: IndexGroup;
	public bufferArrayOffset: number;
	public attributeHeaders: FVTX_ATTRIBUTE_HEADER[] = [];
	public bufferHeaders: FVTX_BUFFER[] = [];
	public vertices: FVTX_VERTEX_ATTRIBUTE[] = [];

	/**
	 * Parses the FVTX from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `FVTX` and
	 * parses the FVTX from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): FVTX {
		const fvtx = new FVTX();
		fvtx.parseFromFileStream(stream);

		return fvtx;
	}

	/**
	 * Parses the FVTX from the input source provided at instantiation
	 */
	public parse(): void {
		this.stream.consumeAll();

		const magic = this.stream.readBytes(0x4);

		if (!FVTX_MAGIC.equals(magic)) {
			throw new Error('Invalid FVTX magic');
		}

		this.attributeCount = this.stream.readUInt8();
		this.bufferCount = this.stream.readUInt8();
		this.sectionIndex = this.stream.readUInt16();
		this.verticesCount = this.stream.readUInt32();
		this.vertexSkinCount = this.stream.readUInt8();

		this.stream.skip(0x3); // * Padding

		this.attributeArrayOffset = this.stream.tell() + this.stream.readInt32();
		this.attributeIndexGroupOffset = this.stream.tell() + this.stream.readInt32();
		this.bufferArrayOffset = this.stream.tell() + this.stream.readInt32();

		this.stream.skip(0x4); // * User pointer

		this.parseAttributeHeaders();
		this.parseBufferHeaders();

		this.stream.seek(this.attributeIndexGroupOffset);
		this.attributeIndexGroup = parseIndexGroup(this.stream);

		this.parseAttributes();
	}

	private parseAttributeHeaders(): void {
		this.stream.seek(this.attributeArrayOffset);

		for (let i = 0; i < this.attributeCount; i++) {
			const nameOffset = this.stream.tell() + this.stream.readInt32();
			const bufferIndex = this.stream.readInt8();

			this.stream.skip(0x1); // * Padding

			const bufferOffset = this.stream.readInt16();
			const format = this.stream.readInt32();
			const name = parseStringTableString(this.stream, nameOffset);

			this.attributeHeaders.push({
				nameOffset: nameOffset,
				name: name as FVTX_ATTRIBUTE_NAME, // TODO - Verify this
				bufferIndex: bufferIndex,
				bufferOffset: bufferOffset,
				format: format
			});
		}
	}

	private parseBufferHeaders(): void {
		this.stream.seek(this.bufferArrayOffset);

		for (let i = 0; i < this.bufferCount; i++) {
			const dataPointer = this.stream.readUInt32();
			const size = this.stream.readUInt32();
			const bufferHandle = this.stream.readUInt32();
			const stride = this.stream.readUInt16();
			const bufferingCount = this.stream.readUInt16();
			const contextPointer = this.stream.readUInt32();
			const dataOffset = this.stream.tell() + this.stream.readInt32();

			this.bufferHeaders.push({
				dataPointer: dataPointer,
				size: size,
				bufferHandle: bufferHandle,
				stride: stride,
				bufferingCount: bufferingCount,
				contextPointer: contextPointer,
				dataOffset: dataOffset
			});
		}
	}

	private parseAttributes(): void {
		for (let vertexIndex = 0; vertexIndex < this.verticesCount; vertexIndex++) {
			const attributes: FVTX_VERTEX_ATTRIBUTE = {};

			for (const header of this.attributeHeaders) {
				const value = this.parseAttributeValue(header, vertexIndex);

				// * A lot of these return types are guesses, I've only seen
				// * _p0, _n0 and _i0 used in my samples
				switch (header.name) {
					case '_p0':
						attributes.position = value as Vec3 | Vec4;
						break;
					case '_n0':
						attributes.normal = value as Vec3 | Vec4;
						break;
					case '_t0':
						attributes.tangent = value as Vec3 | Vec4;
						break;
					case '_b0':
						attributes.binormal = value as Vec3 | Vec4;
						break;
					case '_w0':
						attributes.blendweight = value as number;
						break;
					case '_i0':
						attributes.blendindex = value as number;
						break;
					case '_u0':
						attributes.uv0 = value as Vec2;
						break;
					case '_u1':
						attributes.uv1 = value as Vec2;
						break;
					case '_u2':
						attributes.uv2 = value as Vec2;
						break;
					case '_u3':
						attributes.uv3 = value as Vec2;
						break;
					case '_c0':
						attributes.color0 = value as Vec4;
						break;
					case '_c1':
						attributes.color1 = value as Vec4;
						break;
				}
			}

			this.vertices.push(attributes);
		}
	}

	private parseAttributeValue(header: FVTX_ATTRIBUTE_HEADER, vertexIndex: number): number | Vec2 | Vec3 | Vec4 {
		const bufferHeader = this.bufferHeaders[header.bufferIndex];
		const bufferOffset = header.bufferOffset + (vertexIndex * bufferHeader.stride);

		this.stream.seek(bufferHeader.dataOffset + bufferOffset);

		switch (header.format) {
			case GX2AttribFormat.UNORM_8:
				return this.stream.readUInt8() / 255.0;
			case GX2AttribFormat.UNORM_8_8:
				return [
					this.stream.readUInt8() / 255.0,
					this.stream.readUInt8() / 255.0
				];
			case GX2AttribFormat.UNORM_16_16:
				return [
					this.stream.readUInt16() / 65535.0,
					this.stream.readUInt16() / 65535.0
				];
			case GX2AttribFormat.UNORM_8_8_8_8:
				return [
					this.stream.readUInt8() / 255.0,
					this.stream.readUInt8() / 255.0,
					this.stream.readUInt8() / 255.0,
					this.stream.readUInt8() / 255.0
				];
			case GX2AttribFormat.UINT_8:
				return this.stream.readUInt8();
			case GX2AttribFormat.UINT_8_8:
				return [
					this.stream.readUInt8(),
					this.stream.readUInt8()
				];
			case GX2AttribFormat.UINT_8_8_8_8:
				return [
					this.stream.readUInt8(),
					this.stream.readUInt8(),
					this.stream.readUInt8(),
					this.stream.readUInt8()
				];
			case GX2AttribFormat.SNORM_8:
				return Math.max(this.stream.readInt8() / 127.0, -1.0);
			case GX2AttribFormat.SNORM_8_8:
				return [
					Math.max(this.stream.readInt8() / 127.0, -1.0),
					Math.max(this.stream.readInt8() / 127.0, -1.0)
				];
			case GX2AttribFormat.SNORM_16_16:
				return [
					Math.max(this.stream.readInt16() / 32767.0, -1.0),
					Math.max(this.stream.readInt16() / 32767.0, -1.0)
				];
			case GX2AttribFormat.SNORM_8_8_8_8:
				return [
					Math.max(this.stream.readInt8() / 127.0, -1.0),
					Math.max(this.stream.readInt8() / 127.0, -1.0),
					Math.max(this.stream.readInt8() / 127.0, -1.0),
					Math.max(this.stream.readInt8() / 127.0, -1.0)
				];
			case GX2AttribFormat.SNORM_10_10_10_2:
				const packed = this.stream.readUInt32();
				return [
					Math.max(this.stream.extractSignedBits(packed, 0, 10) / 511.0, -1.0),
					Math.max(this.stream.extractSignedBits(packed, 10, 10) / 511.0, -1.0),
					Math.max(this.stream.extractSignedBits(packed, 20, 10) / 511.0, -1.0),
					Math.max(this.stream.extractSignedBits(packed, 30, 2) / 1.0, -1.0)
				];
			case GX2AttribFormat.SINT_8:
				return this.stream.readInt8();
			case GX2AttribFormat.SINT_8_8:
				return [
					this.stream.readInt8(),
					this.stream.readInt8()
				];
			case GX2AttribFormat.SINT_8_8_8_8:
				return [
					this.stream.readInt8(),
					this.stream.readInt8(),
					this.stream.readInt8(),
					this.stream.readInt8()
				];
			case GX2AttribFormat.FLOAT_32:
				return this.stream.readFloat();
			case GX2AttribFormat.FLOAT_16_16:
				return [
					this.stream.readHalf(),
					this.stream.readHalf()
				];
			case GX2AttribFormat.FLOAT_32_32:
				return [
					this.stream.readFloat(),
					this.stream.readFloat()
				];
			case GX2AttribFormat.FLOAT_16_16_16_16:
				return [
					this.stream.readHalf(),
					this.stream.readHalf(),
					this.stream.readHalf(),
					this.stream.readHalf()
				];
			case GX2AttribFormat.FLOAT_32_32_32:
				return [
					this.stream.readFloat(),
					this.stream.readFloat(),
					this.stream.readFloat()
				];
			case GX2AttribFormat.FLOAT_32_32_32_32:
				return [
					this.stream.readFloat(),
					this.stream.readFloat(),
					this.stream.readFloat(),
					this.stream.readFloat()
				];
		}
	}
}