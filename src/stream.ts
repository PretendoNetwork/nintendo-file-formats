export default class Stream {
	protected buffer: Buffer;
	protected offset = 0;
	public bom = 'le';

	constructor(buffer: Buffer) {
		this.buffer = buffer;
	}

	remaining(): number {
		return this.buffer.length - this.offset;
	}

	alignBlock(alignment: number): void {
		this.offset = Math.ceil(this.offset / alignment) * alignment;
	}

	tell(): number {
		return this.offset;
	}

	seek(offset: number): void {
		this.offset = offset;
	}

	skip(value: number): void {
		this.offset += value;
	}

	read(length: number): Buffer {
		const read = this.buffer.subarray(this.offset, this.offset + length);
		this.offset += length;

		return read;
	}

	readBytes(length: number): Buffer {
		return this.read(length);
	}

	readUInt8(): number {
		return this.readBytes(1).readUInt8();
	}

	readUInt16BE(): number {
		return this.readBytes(2).readUInt16BE();
	}

	readUInt32BE(): number {
		return this.readBytes(4).readUInt32BE();
	}

	readUInt64BE(): bigint {
		return this.readBytes(8).readBigInt64BE();
	}

	readUInt16LE(): number {
		return this.readBytes(2).readUInt16LE();
	}

	readUInt32LE(): number {
		return this.readBytes(4).readUInt32LE();
	}

	readUInt64LE(): bigint {
		return this.readBytes(8).readBigInt64LE();
	}

	readUInt16(): number {
		return this.bom === 'le' ? this.readUInt16LE() : this.readUInt16BE();
	}

	readUInt32(): number {
		return this.bom === 'le' ? this.readUInt32LE() : this.readUInt32BE();
	}

	readUInt64(): bigint {
		return this.bom === 'le' ? this.readUInt64LE() : this.readUInt64BE();
	}

	readUInt16(): number {
		return this.bom === 'le' ? this.readUInt16LE() : this.readUInt16LE();
	}

	readUInt32(): number {
		return this.bom === 'le' ? this.readUInt32LE() : this.readUInt32LE();
	}

	readUInt64(): bigint {
		return this.bom === 'le' ? this.readUInt64LE() : this.readUInt64LE();
	}
}