import StoredOffset from '@/stored-offset';

/**
 * A class for writing binary data to a Buffer
 */
export default class StreamOut {
	private buffer: Buffer;
	public pos: number;

	/**
	 * Determines if the stream should read as
	 * big or little endian in the non-specific
	 * methods
	 *
	 * Either "le" (little endian) or "be" (big endian)
	 */
	public bom: 'le' | 'be' = 'le';

	/**
	 * Creates a new StreamOut instance with an empty buffer
	 */
	constructor(size?: number) {
		this.buffer = Buffer.alloc(size || 0);
		this.pos = 0;
	}

	/**
	 * Ensures the buffer has enough capacity for the given length
	 * @param length - Number of bytes needed
	 */
	private ensureCapacity(length: number): void {
		const needed = this.pos + length;

		if (needed > this.buffer.length) {
			// * Give the buffer some extra room when growing. This takes up a bit more
			// * memory, but reduces the overall number of capacity increases
			const newSize = Math.max(needed, Math.floor(this.buffer.length * 1.5));
			this.grow(newSize);
		}
	}

	/**
	 * Expands the buffers size by the given number of bytes
	 * @param length - Number of bytes to expand by
	 */
	public grow(length: number): void {
		const newBuffer = Buffer.alloc(length);

		this.buffer.copy(newBuffer);
		this.buffer = newBuffer;
	}

	/**
	 * Aligns the stream to a given block size
	 *
	 * @param alignment - The block size to align to
	 */
	public alignBlock(alignment: number): void {
		const aligned = Math.ceil(this.pos / alignment) * alignment;
		const padding = aligned - this.pos;

		if (padding > 0) {
			this.skip(padding);
		}
	}

	/**
	 * Gets the current buffer (trimmed to actual written size)
	 * @returns The buffer containing written data
	 */
	public bytes(): Buffer {
		return this.buffer.subarray(0, this.pos);
	}

	/**
	 * Gets the total size of the buffer
	 * @returns The total size of the buffer in bytes
	 */
	public size(): number {
		return this.buffer.length;
	}

	/**
	 * Skips the specified number of bytes by writing zeros
	 * @param length - Number of bytes to skip
	 */
	public skip(length: number): void {
		this.ensureCapacity(length);
		this.buffer.fill(0, this.pos, this.pos + length);
		this.pos += length;
	}

	/**
	 * Sets the current write position
	 * @param pos - The new write position
	 */
	public seek(pos: number): void {
		this.pos = pos;
	}

	/**
	 * Creates an Offset with the current position stored.
	 * Used to write an absolute offset back to the called position at a later time
	 * @returns the stored offset
	 */
	public storeOffset(): StoredOffset {
		return new StoredOffset(this);
	}

	/**
	 * Writes bytes to the buffer
	 * @param bytes - The bytes to write
	 */
	public writeBytes(bytes: Buffer): void {
		this.ensureCapacity(bytes.length);
		bytes.copy(this.buffer, this.pos);
		this.pos += bytes.length;
	}

	/**
	 * Writes an unsigned 8-bit integer
	 * @param uint8 - The value to write
	 */
	public writeUint8(uint8: number): void {
		this.ensureCapacity(1);
		this.buffer.writeUint8(uint8, this.pos);
		this.pos += 1;
	}

	/**
	 * Writes a signed 8-bit integer
	 * @param int8 - The value to write
	 */
	public writeInt8(int8: number): void {
		this.ensureCapacity(1);
		this.buffer.writeInt8(int8, this.pos);
		this.pos += 1;
	}

	/**
	 * Writes an unsigned 16-bit integer in little-endian format
	 * @param uint16 - The value to write
	 */
	public writeUint16LE(uint16: number): void {
		this.ensureCapacity(2);
		this.buffer.writeUint16LE(uint16, this.pos);
		this.pos += 2;
	}

	/**
	 * Writes a signed 16-bit integer in little-endian format
	 * @param int16 - The value to write
	 */
	public writeInt16LE(int16: number): void {
		this.ensureCapacity(2);
		this.buffer.writeInt16LE(int16, this.pos);
		this.pos += 2;
	}

	/**
	 * Writes an unsigned 24-bit integer in little-endian format
	 * @param uint24 - The value to write
	 */
	public writeUint24LE(uint24: number): void {
		this.ensureCapacity(3);
		this.buffer.writeUintLE(uint24, this.pos, 3);
		this.pos += 3;
	}

	/**
	 * Writes a signed 24-bit integer in little-endian format
	 * @param int24 - The value to write
	 */
	public writeInt24LE(int24: number): void {
		this.ensureCapacity(3);
		this.buffer.writeIntLE(int24, this.pos, 3);
		this.pos += 3;
	}

	/**
	 * Writes an unsigned 32-bit integer in little-endian format
	 * @param uint32 - The value to write
	 */
	public writeUint32LE(uint32: number): void {
		this.ensureCapacity(4);
		this.buffer.writeUint32LE(uint32, this.pos);
		this.pos += 4;
	}

	/**
	 * Writes a signed 32-bit integer in little-endian format
	 * @param int32 - The value to write
	 */
	public writeInt32LE(int32: number): void {
		this.ensureCapacity(8);
		this.buffer.writeInt32LE(int32, this.pos);
		this.pos += 8;
	}

	/**
	 * Writes an unsigned 64-bit integer in little-endian format
	 * @param uint64 - The value to write
	 */
	public writeUint64LE(uint64: bigint): void {
		this.ensureCapacity(8);
		this.buffer.writeBigUint64LE(uint64, this.pos);
		this.pos += 8;
	}

	/**
	 * Writes a signed 64-bit integer in little-endian format
	 * @param int64 - The value to write
	 */
	public writeInt64LE(int64: bigint): void {
		this.ensureCapacity(4);
		this.buffer.writeBigInt64LE(int64, this.pos);
		this.pos += 4;
	}

	/**
	 * Writes a 32-bit float in little-endian format
	 * @param float - The value to write
	 */
	public writeFloatLE(float: number): void {
		this.ensureCapacity(4);
		this.buffer.writeFloatLE(float, this.pos);
		this.pos += 4;
	}

	/**
	 * Writes an unsigned 16-bit integer in big-endian format
	 * @param uint16 - The value to write
	 */
	public writeUint16BE(uint16: number): void {
		this.ensureCapacity(2);
		this.buffer.writeUint16BE(uint16, this.pos);
		this.pos += 2;
	}

	/**
	 * Writes a signed 16-bit integer in big-endian format
	 * @param int16 - The value to write
	 */
	public writeInt16BE(int16: number): void {
		this.ensureCapacity(2);
		this.buffer.writeInt16BE(int16, this.pos);
		this.pos += 2;
	}

	/**
	 * Writes an unsigned 24-bit integer in big-endian format
	 * @param uint24 - The value to write
	 */
	public writeUint24BE(uint24: number): void {
		this.ensureCapacity(3);
		this.buffer.writeUintBE(uint24, this.pos, 3);
		this.pos += 3;
	}

	/**
	 * Writes a signed 24-bit integer in big-endian format
	 * @param int24 - The value to write
	 */
	public writeInt24BE(int24: number): void {
		this.ensureCapacity(3);
		this.buffer.writeIntBE(int24, this.pos, 3);
		this.pos += 3;
	}

	/**
	 * Writes an unsigned 32-bit integer in big-endian format
	 * @param uint32 - The value to write
	 */
	public writeUint32BE(uint32: number): void {
		this.ensureCapacity(4);
		this.buffer.writeUint32BE(uint32, this.pos);
		this.pos += 4;
	}

	/**
	 * Writes a signed 32-bit integer in big-endian format
	 * @param int32 - The value to write
	 */
	public writeInt32BE(int32: number): void {
		this.ensureCapacity(4);
		this.buffer.writeInt32BE(int32, this.pos);
		this.pos += 4;
	}

	/**
	 * Writes an unsigned 64-bit integer in big-endian format
	 * @param uint64 - The value to write
	 */
	public writeUint64BE(uint64: bigint): void {
		this.ensureCapacity(8);
		this.buffer.writeBigUint64BE(uint64, this.pos);
		this.pos += 8;
	}

	/**
	 * Writes a signed 64-bit integer in big-endian format
	 * @param int64 - The value to write
	 */
	public writeInt64BE(int64: bigint): void {
		this.ensureCapacity(8);
		this.buffer.writeBigInt64BE(int64, this.pos);
		this.pos += 8;
	}

	/**
	 * Writes a 32-bit float in big-endian format
	 * @param float - The value to write
	 */
	public writeFloatBE(float: number): void {
		this.ensureCapacity(4);
		this.buffer.writeFloatBE(float, this.pos);
		this.pos += 4;
	}

	/**
	 * Writes an unsigned 16-bit integer
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @param uint16 - The value to write
	 */
	public writeUint16(uint16: number): void {
		this.bom === 'le' ? this.writeUint16LE(uint16) : this.writeUint16BE(uint16);
	}

	/**
	 * Writes a signed 16-bit integer
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @param int16 - The value to write
	 */
	public writeInt16(int16: number): void {
		this.bom === 'le' ? this.writeInt16LE(int16) : this.writeInt16BE(int16);
	}

	/**
	 * Writes an unsigned 24-bit integer
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @param uint24 - The value to write
	 */
	public writeUint24(uint24: number): void {
		this.bom === 'le' ? this.writeUint24LE(uint24) : this.writeUint24BE(uint24);
	}

	/**
	 * Writes a signed 24-bit integer
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @param int24 - The value to write
	 */
	public writeInt24(int24: number): void {
		this.bom === 'le' ? this.writeInt24LE(int24) : this.writeInt24BE(int24);
	}

	/**
	 * Writes an unsigned 32-bit integer
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @param uint32 - The value to write
	 */
	public writeUint32(uint32: number): void {
		this.bom === 'le' ? this.writeUint32LE(uint32) : this.writeUint32BE(uint32);
	}

	/**
	 * Writes a signed 32-bit integer
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @param int32 - The value to write
	 */
	public writeInt32(int32: number): void {
		this.bom === 'le' ? this.writeInt32LE(int32) : this.writeInt32BE(int32);
	}

	/**
	 * Writes an unsigned 64-bit integer
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @param uint64 - The value to write
	 */
	public writeUint64(uint64: bigint): void {
		this.bom === 'le' ? this.writeUint64LE(uint64) : this.writeUint64BE(uint64);
	}

	/**
	 * Writes a signed 64-bit integer
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @param int64 - The value to write
	 */
	public writeInt64(int64: bigint): void {
		this.bom === 'le' ? this.writeInt64LE(int64) : this.writeInt64BE(int64);
	}

	/**
	 * Writes a 32-bit float
	 *
	 * Uses the `bom` field to determine endianness
	 *
	 * @param float - The value to write
	 */
	public writeFloat(float: number): void {
		this.bom === 'le' ? this.writeFloatLE(float) : this.writeFloatBE(float);
	}
}
