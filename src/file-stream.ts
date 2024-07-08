import fs from 'node:fs';
import Stream from '@/stream';

export default class FileStream extends Stream {
	private fd?: number;
	private fileSize?: number;

	constructor(fdOrPathOrBufferOrStream: number | string | Buffer | Stream) {
		if (typeof fdOrPathOrBufferOrStream === 'number') {
			super(Buffer.alloc(0));
			this.fd = fdOrPathOrBufferOrStream;
		} else if (typeof fdOrPathOrBufferOrStream === 'string') {
			super(Buffer.alloc(0));
			this.fd = fs.openSync(fdOrPathOrBufferOrStream, 'r');
		} else {
			super(fdOrPathOrBufferOrStream);
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

	public consumeAll(): void {
		if (this.fd && this.fileSize) {
			this.buffer = Buffer.alloc(this.fileSize);

			fs.readSync(this.fd, this.buffer, 0, this.fileSize, 0);
			fs.closeSync(this.fd);

			this.fd = undefined;
		}
	}
}