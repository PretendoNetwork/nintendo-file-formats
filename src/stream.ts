export default class Stream {
	protected buffer: Buffer;
	protected offset = 0;

	/**
	 * Determines if the stream should read as
	 * big or little endian in the non-specific
	 * methods
	 *
	 * Either "le" (little endian) or "be" (big endian)
	 */
	public bom: 'le' | 'be' = 'le';

	/**
	 * Allows for the storing of context-specific metdata. Useful in
	 * cases such as passing context to sub-streams for files which
	 * contain sub-files
	 */
	public metadata: Record<string, unknown> = {};

	constructor(bufferOrStream: Buffer | Stream) {
		// TODO - This is a hack to support FileStream in the MSBT parser
		if (bufferOrStream instanceof Buffer) {
			this.buffer = bufferOrStream;
		} else {
			this.buffer = bufferOrStream.buffer;
		}
	}

	/**
	 * Checks how much data has been read
	 *
	 * @returns the amount of data in the Buffer that has not been read
	 */
	public remaining(): number {
		return this.buffer.length - this.offset;
	}

	/**
	 * Aligns the stream to a given block size
	 *
	 * @param alignment - The block size to align to
	 */
	public alignBlock(alignment: number): void {
		this.offset = Math.ceil(this.offset / alignment) * alignment;
	}

	/**
	 * Checks the stream position
	 *
	 * @returns the offset the stream is currently at
	 */
	public tell(): number {
		return this.offset;
	}

	/**
	 * Jumps to a specific offset
	 *
	 * @param offset - The offset to jump to
	 */
	public seek(offset: number): void {
		this.offset = offset;
	}

	/**
	 * Checks a byte at either the current or given offset
	 * without advancing the offset
	 *
	 * @param offset - Optional. The offset to check
	 * @returns the byte at the used offset
	 */
	public peek(offset?: number): number {
		if (offset === undefined) {
			offset = this.offset;
		}

		return this.buffer[offset];
	}

	/**
	 * Advances the offset by the provided amount without
	 * reading the data
	 *
	 * @param value - The amount to skip
	 */
	public skip(value: number): void {
		this.offset += value;
	}

	/**
	 * Reads the given amount of data from the stream
	 *
	 * @param length - The amount of data to read
	 * @returns the read data
	 */
	public read(length: number): Buffer {
		const read = this.buffer.subarray(this.offset, this.offset + length);
		this.offset += length;

		return read;
	}

	/**
	 * Alias of `read`
	 *
	 * @param length - The amount of data to read
	 * @returns the read data
	 */
	public readBytes(length: number): Buffer {
		return this.read(length);
	}

	/**
	 * Reads a uint8 from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt8(): number {
		return this.readBytes(1).readUInt8();
	}

	/**
	 * Reads a int8 from the current offset
	 *
	 * @returns the read number
	 */
	public readInt8(): number {
		return this.readBytes(1).readInt8();
	}

	/**
	 * Reads a big-endian uint16 from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt16BE(): number {
		return this.readBytes(2).readUInt16BE();
	}

	/**
	 * Reads a big-endian int16 from the current offset
	 *
	 * @returns the read number
	 */
	public readInt16BE(): number {
		return this.readBytes(2).readInt16BE();
	}

	/**
	 * Reads a big-endian 3 byte unsigned integer from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt24BE(): number {
		return this.readBytes(3).readUIntBE(0, 3);
	}

	/**
	 * Reads a big-endian 3 byte signed integer from the current offset
	 *
	 * @returns the read number
	 */
	public readInt24BE(): number {
		return this.readBytes(3).readIntBE(0, 3);
	}

	/**
	 * Reads a big-endian uint32 from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt32BE(): number {
		return this.readBytes(4).readUInt32BE();
	}

	/**
	 * Reads a big-endian int32 from the current offset
	 *
	 * @returns the read number
	 */
	public readInt32BE(): number {
		return this.readBytes(4).readInt32BE();
	}

	/**
	 * Reads a big-endian uint64 from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt64BE(): bigint {
		return this.readBytes(8).readBigUInt64BE();
	}

	/**
	 * Reads a big-endian int64 from the current offset
	 *
	 * @returns the read number
	 */
	public readInt64BE(): bigint {
		return this.readBytes(8).readBigInt64BE();
	}

	/**
	 * Reads a big-endian float16 (half) from the current offset
	 *
	 * @returns the read number
	 */
	public readHalfBE(): number {
		const bytes = this.readBytes(2);
		const uint16 = bytes.readUInt16BE();
		return float16ToFloat32(uint16);
	}

	/**
	 * Reads a big-endian float32 from the current offset
	 *
	 * @returns the read number
	 */
	public readFloatBE(): number {
		return this.readBytes(4).readFloatBE();
	}

	/**
	 * Reads a big-endian float64 (double) from the current offset
	 *
	 * @returns the read number
	 */
	public readDoubleBE(): number {
		return this.readBytes(8).readDoubleBE();
	}

	/**
	 * Reads a little-endian uint16 from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt16LE(): number {
		return this.readBytes(2).readUInt16LE();
	}

	/**
	 * Reads a little-endian int16 from the current offset
	 *
	 * @returns the read number
	 */
	public readInt16LE(): number {
		return this.readBytes(2).readInt16LE();
	}

	/**
	 * Reads a little-endian 3 byte unsigned integer from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt24LE(): number {
		return this.readBytes(3).readUIntLE(0, 3);
	}

	/**
	 * Reads a little-endian 3 byte signed integer from the current offset
	 *
	 * @returns the read number
	 */
	public readInt24LE(): number {
		return this.readBytes(3).readIntLE(0, 3);
	}

	/**
	 * Reads a little-endian uint32 from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt32LE(): number {
		return this.readBytes(4).readUInt32LE();
	}

	/**
	 * Reads a little-endian int32 from the current offset
	 *
	 * @returns the read number
	 */
	public readInt32LE(): number {
		return this.readBytes(4).readInt32LE();
	}

	/**
	 * Reads a little-endian uint64 from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt64LE(): bigint {
		return this.readBytes(8).readBigUInt64LE();
	}

	/**
	 * Reads a little-endian int64 from the current offset
	 *
	 * @returns the read number
	 */
	public readInt64LE(): bigint {
		return this.readBytes(8).readBigInt64LE();
	}

	/**
	 * Reads a little-endian float16 (half) from the current offset
	 *
	 * @returns the read number
	 */
	public readHalfLE(): number {
		const bytes = this.readBytes(2);
		const uint16 = bytes.readUInt16LE();
		return float16ToFloat32(uint16);
	}

	/**
	 * Reads a little-endian float32 from the current offset
	 *
	 * @returns the read number
	 */
	public readFloatLE(): number {
		return this.readBytes(4).readFloatLE();
	}

	/**
	 * Reads a little-endian float64 (double) from the current offset
	 *
	 * @returns the read number
	 */
	public readDoubleLE(): number {
		return this.readBytes(8).readDoubleLE();
	}

	/**
	 * Reads a uint16 from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readUInt16(): number {
		return this.bom === 'le' ? this.readUInt16LE() : this.readUInt16BE();
	}

	/**
	 * Reads a int16 from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readInt16(): number {
		return this.bom === 'le' ? this.readInt16LE() : this.readInt16BE();
	}

	/**
	 * Reads a 3 byte unsigned integer from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readUInt24(): number {
		return this.bom === 'le' ? this.readUInt24LE() : this.readUInt24BE();
	}

	/**
	 * Reads a 3 byte signed integer from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readInt24(): number {
		return this.bom === 'le' ? this.readInt24LE() : this.readInt24BE();
	}

	/**
	 * Reads a uint32 from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readUInt32(): number {
		return this.bom === 'le' ? this.readUInt32LE() : this.readUInt32BE();
	}

	/**
	 * Reads a int32 from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readInt32(): number {
		return this.bom === 'le' ? this.readInt32LE() : this.readInt32BE();
	}

	/**
	 * Reads a uint64 from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readUInt64(): bigint {
		return this.bom === 'le' ? this.readUInt64LE() : this.readUInt64BE();
	}

	/**
	 * Reads a int64 from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readInt64(): bigint {
		return this.bom === 'le' ? this.readInt64LE() : this.readInt64BE();
	}

	/**
	 * Reads a float16 (half) from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readHalf(): number {
		return this.bom === 'le' ? this.readHalfLE() : this.readHalfBE();
	}

	/**
	 * Reads a float32 from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readFloat(): number {
		return this.bom === 'le' ? this.readFloatLE() : this.readFloatBE();
	}

	/**
	 * Reads a float64 (double) from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readDouble(): number {
		return this.bom === 'le' ? this.readDoubleLE() : this.readDoubleBE();
	}

	/**
	 * Extracts a signed integer from a packed value
	 *
	 * @param value - The packed value to extract from
	 * @param bitOffset - Starting bit position (0-based, from LSB)
	 * @param bitLength - Number of bits to extract
	 * @returns the extracted signed integer
	 */
	public extractSignedBits(value: number, bitOffset: number, bitLength: number): number {
		const mask = (1 << bitLength) - 1;
		let extracted = (value >> bitOffset) & mask;

		const signBit = 1 << (bitLength - 1);
		if (extracted & signBit) {
			extracted |= ~mask;
		}

		return extracted;
	}
}

function float16ToFloat32(uint16: number): number {
	const sign = (uint16 & 0x8000) >> 15;
	const exponent = (uint16 & 0x7C00) >> 10;
	const fraction = uint16 & 0x03FF;

	if (exponent === 0) {
		if (fraction === 0) {
			return sign ? -0 : 0;
		}

		return (sign ? -1 : 1) * Math.pow(2, -14) * (fraction / 1024);
	}

	if (exponent === 0x1F) {
		return fraction ? NaN : (sign ? -Infinity : Infinity);
	}

	return (sign ? -1 : 1) * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
}