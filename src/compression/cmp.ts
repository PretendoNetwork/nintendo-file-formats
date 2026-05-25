import zlib from 'node:zlib';
import { FileStream } from '@/file-stream';

// * Unsure what the real name of this is. Switch Toolbox uses the ZCMP class for
// * files that end with `*.cmp`, however `main.sgarc.cmp` found in Mii Maker has
// * a different format? This is designed for the file(s) in Mii Maker

/**
 * CMP handles the decompression of files using ZLIB. Files of this type usually end
 * with `*.cmp`
 */
export class CMP {
	private stream: FileStream;

	/**
	 * Decompresses the CMP-compressed data from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public decompressFromFile(fdOrPath: number | string): Buffer {
		this.stream = new FileStream(fdOrPath);
		return this.decompress();
	}

	/**
	 * Decompresses the CMP-compressed data from the provided `buffer`
	 *
	 * @param buffer - CMP-compressed data buffer
	 */
	public decompressFromBuffer(buffer: Buffer): Buffer {
		this.stream = new FileStream(buffer);
		return this.decompress();
	}

	/**
	 * Decompresses the CMP-compressed data from the provided string
	 *
	 * Calls `decompressFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded CMP-compressed data
	 */
	public decompressFromString(base64: string): Buffer {
		return this.decompressFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Decompresses the CMP-compressed data from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public decompressFromFileStream(stream: FileStream): Buffer {
		this.stream = stream;
		return this.decompress();
	}

	/**
	 * Creates a new instance of `CMP` and
	 * parses the CMP-compressed data from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public static fromFile(fdOrPath: number | string): Buffer {
		const cmp = new CMP();
		return cmp.decompressFromFile(fdOrPath);
	}

	/**
	 * Creates a new instance of `CMP` and
	 * parses the CMP-compressed data from the provided `buffer`
	 *
	 * @param buffer - CMP-compressed data buffer
	 */
	public static fromBuffer(buffer: Buffer): Buffer {
		const cmp = new CMP();
		return cmp.decompressFromBuffer(buffer);
	}

	/**
	 * Creates a new instance of `CMP` and
	 * parses the CMP-compressed data from the provided string
	 *
	 * Calls `decompressFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded CMP-compressed data
	 */
	public static fromString(base64: string): Buffer {
		const cmp = new CMP();
		return cmp.decompressFromString(base64);
	}

	/**
	 * Creates a new instance of `CMP` and
	 * parses the CMP-compressed data from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): Buffer {
		const cmp = new CMP();
		return cmp.decompressFromFileStream(stream);
	}

	private decompress(): Buffer {
		const decompressedSize = this.stream.readUInt32BE();
		const compressedSize = this.stream.remaining();
		const compressed = this.stream.readBytes(compressedSize);
		const decompressed = zlib.inflateSync(compressed);

		if (decompressed.length !== decompressedSize) {
			throw new Error(`Invalid decompressed size. Expected ${decompressedSize}, got ${decompressed.length}`);
		}

		return decompressed;
	}
}
