import FileStream from '@/file-stream';
import FFLiMiiDataOfficial from '@/mii/ffl-imii-data-official';

export default class FFLStoreData {
	private stream: FileStream;

	/**
	 * Internal Mii data and creator name
	 */
	public FFLiMiiDataOfficial = new FFLiMiiDataOfficial();

	/**
	 * Unknown. Presumed padding
	 */
	public padding: Buffer;

	/**
	 * Checksum
	 */
	public crc: number;

	/**
	 * Parses the FFLStoreData from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public parseFromFile(fdOrPath: number | string): void {
		this.stream = new FileStream(fdOrPath);
		this.parse();
	}

	/**
	 * Parses the FFLStoreData from the provided `buffer`
	 *
	 * @param buffer - FFLStoreData data buffer
	 */
	public parseFromBuffer(buffer: Buffer): void {
		this.stream = new FileStream(buffer);
		this.parse();
	}

	/**
	 * Parses the FFLStoreData from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded FFLStoreData data
	 */
	public parseFromString(base64: string): void {
		this.parseFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Parses the FFLStoreData from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `FFLStoreData` and
	 * parses the FFLStoreData from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public static fromFile(fdOrPath: number | string): FFLStoreData {
		const fflStoreData = new FFLStoreData();
		fflStoreData.parseFromFile(fdOrPath);

		return fflStoreData;
	}

	/**
	 * Creates a new instance of `FFLStoreData` and
	 * parses the FFLStoreData from the provided `buffer`
	 *
	 * @param buffer - FFLStoreData data buffer
	 */
	public static fromBuffer(buffer: Buffer): FFLStoreData {
		const fflStoreData = new FFLStoreData();
		fflStoreData.parseFromBuffer(buffer);

		return fflStoreData;
	}

	/**
	 * Creates a new instance of `FFLStoreData` and
	 * parses the FFLStoreData from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded FFLStoreData data
	 */
	public static fromString(base64: string): FFLStoreData {
		const fflStoreData = new FFLStoreData();
		fflStoreData.parseFromString(base64);

		return fflStoreData;
	}

	/**
	 * Creates a new instance of `FFLStoreData` and
	 * parses the FFLStoreData from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): FFLStoreData {
		const fflStoreData = new FFLStoreData();
		fflStoreData.parseFromFileStream(stream);

		return fflStoreData;
	}

	/**
	 * Encodes the FFLStoreData data into a Buffer
	 *
	 * @returns encoded FFLStoreData
	 */
	public bytes(): Buffer {
		const ffliMiiDataOfficial = this.FFLiMiiDataOfficial.bytes();
		const crcData = Buffer.concat([
			ffliMiiDataOfficial,
			this.padding ? this.padding : Buffer.alloc(2)
		]);
		const crc = Buffer.alloc(2);

		crc.writeUInt16BE(this.calculateCRC(crcData));

		return Buffer.concat([
			crcData,
			crc
		]);
	}

	private parse(): void {
		const size = this.stream.remaining();

		if (size !== 0x60) {
			throw new Error(`Invalid FFLStoreData size. Expected 96 bytes, got ${size}`);
		}

		const ffliMiiDataOfficial = this.stream.readBytes(0x5C);
		const padding = this.stream.readBytes(2);
		const expectedCRC = this.stream.readUInt16BE();

		const crcData = Buffer.concat([
			ffliMiiDataOfficial,
			padding
		]);
		const calculatedCRC = this.calculateCRC(crcData);

		if (expectedCRC !== calculatedCRC) {
			throw new Error(`Invalid FFLStoreData CRC16. Expected ${expectedCRC}, got ${calculatedCRC}`);
		}

		this.FFLiMiiDataOfficial.parseFromBuffer(ffliMiiDataOfficial);
		this.padding = padding;
		this.crc = expectedCRC;
	}

	private calculateCRC(data: Buffer): number {
		// * Credit to https://3dbrew.org/wiki/Mii#Checksum
		let crc = 0x0000;

		for (const byte of data) {
			for (let bit = 7; bit >= 0; bit--) {
				const flag = (crc & 0x8000) != 0;
				crc = ((crc << 1) | ((byte >> bit) & 0x1)) ^ (flag ? 0x1021 : 0);
			}
		}

		for (let i = 16; i > 0; i--) {
			const flag = (crc & 0x8000) != 0;
			crc = (crc << 1) ^ (flag ? 0x1021 : 0);
		}

		return crc & 0xFFFF;
	}
}