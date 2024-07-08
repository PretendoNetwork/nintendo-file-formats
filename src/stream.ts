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
	public bom = 'le';

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
	 * Reads a big-endian uint16 from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt16BE(): number {
		return this.readBytes(2).readUInt16BE();
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
	 * Reads a big-endian uint64 from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt64BE(): bigint {
		return this.readBytes(8).readBigInt64BE();
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
	 * Reads a little-endian uint32 from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt32LE(): number {
		return this.readBytes(4).readUInt32LE();
	}

	/**
	 * Reads a little-endian uint64 from the current offset
	 *
	 * @returns the read number
	 */
	public readUInt64LE(): bigint {
		return this.readBytes(8).readBigInt64LE();
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
	 * Reads a uint64 from the current offset
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @returns the read number
	 */
	public readUInt64(): bigint {
		return this.bom === 'le' ? this.readUInt64LE() : this.readUInt64BE();
	}
}