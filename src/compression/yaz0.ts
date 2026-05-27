import { FileStream } from '@/file-stream';
import { Stream } from '@/stream';

const YAZ0_MAGIC = Buffer.from('Yaz0');

/**
 * Yaz0 handles the decompression of files using Yaz0
 */
export class Yaz0 {
	private stream: FileStream;

	/**
	 * Decompresses the Yaz0-compressed data from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public decompressFromFile(fdOrPath: number | string): Buffer {
		this.stream = new FileStream(fdOrPath);
		return this.decompress();
	}

	/**
	 * Decompresses the Yaz0-compressed data from the provided `buffer`
	 *
	 * @param buffer - Yaz0-compressed data buffer
	 */
	public decompressFromBuffer(buffer: Buffer): Buffer {
		this.stream = new FileStream(buffer);
		return this.decompress();
	}

	/**
	 * Decompresses the Yaz0-compressed data from the provided string
	 *
	 * Calls `decompressFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded Yaz0-compressed data
	 */
	public decompressFromString(base64: string): Buffer {
		return this.decompressFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Decompresses the Yaz0-compressed data from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public decompressFromFileStream(stream: FileStream): Buffer {
		this.stream = stream;
		return this.decompress();
	}

	/**
	 * Creates a new instance of `Yaz0` and
	 * parses the Yaz0-compressed data from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public static fromFile(fdOrPath: number | string): Buffer {
		const yaz0 = new Yaz0();
		return yaz0.decompressFromFile(fdOrPath);
	}

	/**
	 * Creates a new instance of `Yaz0` and
	 * parses the Yaz0-compressed data from the provided `buffer`
	 *
	 * @param buffer - Yaz0-compressed data buffer
	 */
	public static fromBuffer(buffer: Buffer): Buffer {
		const yaz0 = new Yaz0();
		return yaz0.decompressFromBuffer(buffer);
	}

	/**
	 * Creates a new instance of `Yaz0` and
	 * parses the Yaz0-compressed data from the provided string
	 *
	 * Calls `decompressFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded Yaz0-compressed data
	 */
	public static fromString(base64: string): Buffer {
		const yaz0 = new Yaz0();
		return yaz0.decompressFromString(base64);
	}

	/**
	 * Creates a new instance of `Yaz0` and
	 * parses the Yaz0-compressed data from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): Buffer {
		const yaz0 = new Yaz0();
		return yaz0.decompressFromFileStream(stream);
	}

	private decompress(): Buffer {
		const magic = this.stream.readBytes(4);

		if (!YAZ0_MAGIC.equals(magic)) {
			throw new Error('Invalid Yaz0 magic');
		}

		const decompressedSize = this.stream.readUInt32BE();

		this.stream.skip(4); // * Reserved, ignore for now
		this.stream.skip(4); // * Reserved, ignore for now

		const compressedSize = this.stream.remaining();
		const compressed = this.stream.readBytes(compressedSize);
		const compressedStream = new Stream(compressed);
		const decompressed = Buffer.alloc(decompressedSize);
		let outputBytePosition = 0;

		while (compressedStream.remaining()) {
			const groupHeader = compressedStream.readUInt8();

			for (let chunk = 0; chunk < 8 && compressedStream.remaining(); chunk++) {
				const bitMask = 0x80 >> chunk;
				const isLiteral = (groupHeader & bitMask) !== 0;
				const firstByte = compressedStream.readUInt8();

				if (isLiteral) {
					decompressed[outputBytePosition++] = firstByte;
				} else {
					const secondByte = compressedStream.readUInt8();

					const distance = ((firstByte & 0x0F) << 8) | secondByte;
					let length: number;

					if ((firstByte & 0xF0) !== 0) {
						const n = (firstByte & 0xF0) >> 4;
						length = n + 2;
					} else {
						const thirdByte = compressedStream.readUInt8();
						length = thirdByte + 0x12;
					}

					const backReferenceStart = outputBytePosition - distance - 1;

					for (let i = 0; i < length && outputBytePosition < decompressedSize; i++) {
						decompressed[outputBytePosition] = decompressed[backReferenceStart + i];
						outputBytePosition++;
					}
				}
			}
		}

		return decompressed;
	}
}
