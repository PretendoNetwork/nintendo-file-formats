import type StreamOut from '@/stream-out';

/**
 * Represents an absolute offset that is stored on a StreamOut.
 * Used when a file format uses absolute file offsets, but needs to encode data incrementally.
 * Stores the byte offset of the StreamOut when created, and writes the current StreamOut offset to it later.
 */
export default class StoredOffset {
	private stream: StreamOut;
	private storedPosition: number;

	constructor(stream: StreamOut) {
		this.stream = stream;
		this.storedPosition = this.stream.pos;
		this.stream.skip(4); // TODO - Support different sized offsets?
	}

	/**
	 * Writes the current StreamOut offset to the position stored when this class was created.
	 */
	public write(): void {
		const absoluteOffset = this.stream.pos;

		this.stream.seek(this.storedPosition);
		this.stream.writeUint32(absoluteOffset);
		this.stream.seek(absoluteOffset);
	}
}
