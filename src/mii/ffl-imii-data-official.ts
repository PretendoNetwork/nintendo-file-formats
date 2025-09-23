import { Buffer } from 'node:buffer';
import FileStream from '@/file-stream';
import FFLiMiiDataCore from '@/mii/ffl-imii-data-core';

export default class FFLiMiiDataOfficial {
	private stream: FileStream;

	/**
	 * Internal Mii data
	 */
	public core = new FFLiMiiDataCore();

	/**
	 * UTF-16 creator name
	 */
	public creatorName: string;

	/**
	 * Parses the FFLiMiiDataOfficial from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public parseFromFile(fdOrPath: number | string): void {
		this.stream = new FileStream(fdOrPath);
		this.parse();
	}

	/**
	 * Parses the FFLiMiiDataOfficial from the provided `buffer`
	 *
	 * @param buffer - FFLiMiiDataOfficial data buffer
	 */
	public parseFromBuffer(buffer: Buffer): void {
		this.stream = new FileStream(buffer);
		this.parse();
	}

	/**
	 * Parses the FFLiMiiDataOfficial from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded FFLiMiiDataOfficial data
	 */
	public parseFromString(base64: string): void {
		this.parseFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Parses the FFLiMiiDataOfficial from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `FFLiMiiDataOfficial` and
	 * parses the FFLiMiiDataOfficial from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public static fromFile(fdOrPath: number | string): FFLiMiiDataOfficial {
		const ffliMiiDataOfficial = new FFLiMiiDataOfficial();
		ffliMiiDataOfficial.parseFromFile(fdOrPath);

		return ffliMiiDataOfficial;
	}

	/**
	 * Creates a new instance of `FFLiMiiDataOfficial` and
	 * parses the FFLiMiiDataOfficial from the provided `buffer`
	 *
	 * @param buffer - FFLiMiiDataOfficial data buffer
	 */
	public static fromBuffer(buffer: Buffer): FFLiMiiDataOfficial {
		const ffliMiiDataOfficial = new FFLiMiiDataOfficial();
		ffliMiiDataOfficial.parseFromBuffer(buffer);

		return ffliMiiDataOfficial;
	}

	/**
	 * Creates a new instance of `FFLiMiiDataOfficial` and
	 * parses the FFLiMiiDataOfficial from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded FFLiMiiDataOfficial data
	 */
	public static fromString(base64: string): FFLiMiiDataOfficial {
		const ffliMiiDataOfficial = new FFLiMiiDataOfficial();
		ffliMiiDataOfficial.parseFromString(base64);

		return ffliMiiDataOfficial;
	}

	/**
	 * Creates a new instance of `FFLiMiiDataOfficial` and
	 * parses the FFLiMiiDataOfficial from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): FFLiMiiDataOfficial {
		const ffliMiiDataOfficial = new FFLiMiiDataOfficial();
		ffliMiiDataOfficial.parseFromFileStream(stream);

		return ffliMiiDataOfficial;
	}

	/**
	 * Encodes the FFLiMiiDataOfficial data into a Buffer
	 *
	 * @returns encoded FFLiMiiDataOfficial
	 */
	public bytes(): Buffer {
		return Buffer.concat([
			this.core.bytes(),
			Buffer.from(this.creatorName.padEnd(10, '\x00'), 'utf16le')
		]);
	}

	private parse(): void {
		const size = this.stream.remaining();

		if (size !== 0x5C) {
			throw new Error(`Invalid ${this.constructor.name} size. Expected 92 bytes, got ${size}`);
		}

		const ffliMiiDataCore = this.stream.readBytes(0x48);
		const creatorName = this.stream.readBytes(0x14).toString('utf16le');

		this.core.parseFromBuffer(ffliMiiDataCore);
		this.creatorName = creatorName.replace(/\0.*$/, ''); // TODO - This is kinda ugly?
	}
}

// * Aliases. No functionality differences, just purely for different visual contexts

export class CFLiPackedMiiDataOfficial extends FFLiMiiDataOfficial {}
export class Ver3StoreDataRaw extends FFLiMiiDataOfficial {}