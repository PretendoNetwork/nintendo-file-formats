import fs from 'node:fs';
import Stream from '@/stream';

export default class FileStream extends Stream {
	private fd?: number;
	private fileSize?: number;

	constructor(fdOrPathOrBuffer: number | string | Buffer) {
		if (typeof fdOrPathOrBuffer === 'number') {
			super(Buffer.alloc(0));
			this.fd = fdOrPathOrBuffer;
		} else if (typeof fdOrPathOrBuffer === 'string') {
			super(Buffer.alloc(0));
			this.fd = fs.openSync(fdOrPathOrBuffer, 'r');
		} else {
			super(fdOrPathOrBuffer);
		}

		if (this.fd) {
			const stat = fs.fstatSync(this.fd);
			this.fileSize = stat.size;
		}
	}

	public remaining(): number {
		if (this.fileSize) {
			return this.fileSize - this.offset;
		} else {
			return super.remaining();
		}
	}

	public read(length: number): Buffer {
		let read: Buffer;

		if (this.fd) {
			read = Buffer.alloc(length);
			fs.readSync(this.fd!, read, 0, length, this.offset);
		} else {
			read = this.buffer.subarray(this.offset, this.offset + length);
		}

		this.offset += length;

		return read;
	}
}