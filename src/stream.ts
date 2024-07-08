export default class Stream {
	protected buffer: Buffer;
	protected offset = 0;
	public bom = 'le';

	constructor(bufferOrStream: Buffer | Stream) {
		// TODO - This is a hack to support FileStream in the MSBT parser
		if (bufferOrStream instanceof Buffer) {
			this.buffer = bufferOrStream;
		} else {
			this.buffer = bufferOrStream.buffer;
		}
	}

	public remaining(): number {
		return this.buffer.length - this.offset;
	}

	public alignBlock(alignment: number): void {
		this.offset = Math.ceil(this.offset / alignment) * alignment;
	}

	public tell(): number {
		return this.offset;
	}

	public seek(offset: number): void {
		this.offset = offset;
	}

	public peek(offset?: number): number {
		if (offset === undefined) {
			offset = this.offset;
		}

		return this.buffer[offset];
	}

	public skip(value: number): void {
		this.offset += value;
	}

	public read(length: number): Buffer {
		const read = this.buffer.subarray(this.offset, this.offset + length);
		this.offset += length;

		return read;
	}

	public readBytes(length: number): Buffer {
		return this.read(length);
	}

	public readUInt8(): number {
		return this.readBytes(1).readUInt8();
	}

	public readUInt16BE(): number {
		return this.readBytes(2).readUInt16BE();
	}

	public readUInt32BE(): number {
		return this.readBytes(4).readUInt32BE();
	}

	public readUInt64BE(): bigint {
		return this.readBytes(8).readBigInt64BE();
	}

	public readUInt16LE(): number {
		return this.readBytes(2).readUInt16LE();
	}

	public readUInt32LE(): number {
		return this.readBytes(4).readUInt32LE();
	}

	public readUInt64LE(): bigint {
		return this.readBytes(8).readBigInt64LE();
	}

	public readUInt16(): number {
		return this.bom === 'le' ? this.readUInt16LE() : this.readUInt16BE();
	}

	public readUInt32(): number {
		return this.bom === 'le' ? this.readUInt32LE() : this.readUInt32BE();
	}

	public readUInt64(): bigint {
		return this.bom === 'le' ? this.readUInt64LE() : this.readUInt64BE();
	}
}