import encode from 'image-encode';
import FileStream from '@/file-stream';

const TILE_ORDER = [
	0, 1, 8, 9, 2, 3, 10, 11, 16, 17, 24, 25, 18, 19, 26, 27, 4, 5, 12, 13, 6, 7,
	14, 15, 20, 21, 28, 29, 22, 23, 30, 31, 32, 33, 40, 41, 34, 35, 42, 43, 48,
	49, 56, 57, 50, 51, 58, 59, 36, 37, 44, 45, 38, 39, 46, 47, 52, 53, 60, 61,
	54, 55, 62, 63
];

export interface SMDHApplicationTitle {
	descriptionShort: string;
	descriptionLong: string;
	publisher: string;
}

export interface SMDHApplicationSettings {
	regionSpecificGameRatings: Buffer;
	regionLockout: number;
	matchMakerIDs: Buffer;
	flags: number;
	EULAVersion: number;
	reserved: number;
	optimalAnimationDefaultFrame: number;
	streetPassID: number;
}

type IconExportFormat = 'png' | 'image/png' | 'gif' | 'image/gif' | 'jpg' | 'jpeg' | 'image/jpg' | 'image/jpeg' | 'bmp' | 'image/bmp' | 'image/bitmap' | 'tiff' | 'tif' | 'exif' | 'image/tif' | 'image/tiff';

interface IconConversionOptions {
	inputData: Buffer;
	inputFormat: 'rgb565' | 'rgb888' | 'bgr565' | 'bgr888' | 'a8';
	outputFormat: IconExportFormat;
	width: number;
	height: number;
}

interface IconConversionResult {
	data: Buffer;
	width: number;
	height: number;
}

export default class SMDH {
	private stream: FileStream;
	// * Not storing the magic, not needed

	/**
	 * SMDH version
	 */
	public version: number;

	/**
	 * Unused
	 */
	public reserved1: number; // * 2 bytes

	/**
	 * List of title information of the title the SMDH is for.
	 * Each index is a different language:
	 *
	 * 0. Japanese
	 * 1. English
	 * 2. French
	 * 3. German
	 * 4. Italian
	 * 5. Spanish
	 * 6. Simplified Chinese
	 * 7. Korean
	 * 8. Dutch
	 * 9. Portuguese
	 * 10. Russian
	 * 11. Traditional Chinese
	 */
	public applicationTitles: SMDHApplicationTitle[] = [];

	/**
	 * Settings used by the Home Menu
	 */
	public applicationSettings: SMDHApplicationSettings;

	/**
	 * Unused
	 */
	public reserved2: bigint;

	/**
	 * Raw data for the small (24x24) icon
	 */
	public iconSmall: Buffer;

	/**
	 * Raw data for the large (48x48) icon
	 */
	public iconLarge: Buffer;

	/**
	 * Parses the SMDH from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public parseFromFile(fdOrPath: number | string): void {
		this.stream = new FileStream(fdOrPath);
		this.parse();
	}

	/**
	 * Parses the SMDH from the provided `buffer`
	 *
	 * @param buffer - SMDH data buffer
	 */
	public parseFromBuffer(buffer: Buffer): void {
		this.stream = new FileStream(buffer);
		this.parse();
	}

	/**
	 * Parses the SMDH from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded SMDH data
	 */
	public parseFromString(base64: string): void {
		this.parseFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Parses the SMDH from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `SMDH` and
	 * parses the SMDH from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public static fromFile(fdOrPath: number | string): SMDH {
		const smdh = new SMDH();
		smdh.parseFromFile(fdOrPath);

		return smdh;
	}

	/**
	 * Creates a new instance of `SMDH` and
	 * parses the SMDH from the provided `buffer`
	 *
	 * @param buffer - SMDH data buffer
	 */
	public static fromBuffer(buffer: Buffer): SMDH {
		const smdh = new SMDH();
		smdh.parseFromBuffer(buffer);

		return smdh;
	}

	/**
	 * Creates a new instance of `SMDH` and
	 * parses the SMDH from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded SMDH data
	 */
	public static fromString(base64: string): SMDH {
		const smdh = new SMDH();
		smdh.parseFromString(base64);

		return smdh;
	}

	/**
	 * Creates a new instance of `SMDH` and
	 * parses the SMDH from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): SMDH {
		const smdh = new SMDH();
		smdh.parseFromFileStream(stream);

		return smdh;
	}

	private parse(): void {
		const magic = this.stream.readBytes(0x4);

		if (magic.toString() !== 'SMDH') {
			throw new Error('Invalid SMDH');
		}

		this.version = this.stream.readUInt16LE();
		this.reserved1 = this.stream.readUInt16LE();

		for (let i = 0; i < 16; i++) {
			this.applicationTitles.push({
				descriptionShort: this.stream.readBytes(0x80).toString('utf16le').split('\0')[0],
				descriptionLong: this.stream.readBytes(0x100).toString('utf16le').split('\0')[0],
				publisher: this.stream.readBytes(0x80).toString('utf16le').split('\0')[0],
			});
		}

		this.applicationSettings = {
			regionSpecificGameRatings: this.stream.readBytes(0x10), // TODO - Decode this
			regionLockout: this.stream.readUInt32LE(), // TODO - Split the flags?
			matchMakerIDs: this.stream.readBytes(0xC), // TODO - Decode this
			flags: this.stream.readUInt32LE(), // TODO - Split the flags?
			EULAVersion: this.stream.readUInt16LE(),
			reserved: this.stream.readUInt16LE(),
			optimalAnimationDefaultFrame: this.stream.readUInt32LE(),
			streetPassID: this.stream.readUInt32LE(),
		};

		this.reserved2 = this.stream.readUInt64LE();
		this.iconSmall = this.stream.readBytes(0x480);
		this.iconLarge = this.stream.readBytes(0x1200);
	}

	private convertTiledImage(options: IconConversionOptions): IconConversionResult {
		// * This is largely based on
		// * https://github.com/DanTheMan827/node-tiled-image-tools/blob/7dac75545b4ba42a5b11fe900db0315d69409bc0/index.js#L100C1-L180
		// * I didn't like the useless reliance on a promise,
		// * and wanted to clean some things up to a bit more
		// * modern standard (no var, for example)
		let is565 = false;
		let isBGR = false;

		switch (options.inputFormat) {
			case 'rgb565':
				is565 = true;
				isBGR = false;
				break;
			case 'rgb888':
				is565 = false;
				isBGR = false;
				break;
			case 'bgr565':
				is565 = true;
				isBGR = true;
				break;
			case 'bgr888':
				is565 = false;
				isBGR = true;
				break;
			case 'a8':
				is565 = false;
				isBGR = false;
				break;
			default:
				throw new Error(`Unsupported SMDH icon type ${options.inputFormat}`);
		}

		const rgbaData = Buffer.alloc((options.width * options.height) * 4);
		let i = 0;

		for (let tileY = 0; tileY < options.height; tileY += 8) {
			for (let tileX = 0; tileX < options.width; tileX += 8) {
				for (let k = 0; k < 8 * 8; k++) {
					const x = TILE_ORDER[k] & 0x7;
					const y = TILE_ORDER[k] >> 3;
					let r;
					let g;
					let b;

					if (is565) {
						const color = options.inputData[i++] | (options.inputData[i++] << 8);
						r = ((color >> 11) & 0x1F) << 3;
						g = ((color >> 5) & 0x3F) << 2;
						b = (color & 0x1F) << 3;
					} else if (options.inputFormat === 'a8') {
						r = options.inputData[i++];
						g = r;
						b = g;
					} else {
						r = options.inputData[i++];
						g = options.inputData[i++];
						b = options.inputData[i++];
					}

					if ((y + tileY) < options.height && (x + tileX) < options.width) {
						const offset = (((y + tileY) * options.width) + (x + tileX)) * 4;

						rgbaData[offset] = (isBGR ? b : r);
						rgbaData[offset + 1] = g;
						rgbaData[offset + 2] = (isBGR ? r : b);
						rgbaData[offset + 3] = 255;
					}
				}
			}
		}

		return {
			data: rgbaData,
			width: options.width,
			height: options.height
		};
	}

	/**
	 * Exports the SMDH large (48x48) image
	 *
	 * @param outputFormat - The image format to output to
	 * @returns Buffer of image data
	 */
	public exportLargeImage(outputFormat: IconExportFormat = 'png'): Buffer {
		const converted = this.convertTiledImage({
			inputData: this.iconLarge,
			inputFormat: 'rgb565',
			outputFormat: outputFormat,
			width: 48,
			height: 48
		});

		return Buffer.from(encode(converted.data, [converted.width, converted.height], outputFormat));
	}

	/**
	 * Exports the SMDH smal (24x24) image
	 *
	 * @param outputFormat - The image format to output to
	 * @returns Buffer of image data
	 */
	public exportSmallImage(outputFormat: IconExportFormat = 'png'): Buffer {
		const converted = this.convertTiledImage({
			inputData: this.iconSmall,
			inputFormat: 'rgb565',
			outputFormat: outputFormat,
			width: 24,
			height: 24
		});

		return Buffer.from(encode(converted.data, [converted.width, converted.height], outputFormat));
	}

	/**
	 * Gets the SMDB Japanese title information
	 *
	 * @returns the Japanese title information
	 */
	public getJapaneseApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[0];
	}

	/**
	 * Gets the SMDB English title information
	 *
	 * @returns the English title information
	 */
	public getEnglishApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[1];
	}

	/**
	 * Gets the SMDB French title information
	 *
	 * @returns the French title information
	 */
	public getFrenchApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[2];
	}

	/**
	 * Gets the SMDB German title information
	 *
	 * @returns the German title information
	 */
	public getGermanApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[3];
	}

	/**
	 * Gets the SMDB Italian title information
	 *
	 * @returns the Italian title information
	 */
	public getItalianApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[4];
	}

	/**
	 * Gets the SMDB Spanish title information
	 *
	 * @returns the Spanish title information
	 */
	public getSpanishApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[5];
	}

	/**
	 * Gets the SMDB simplified Chinese title information
	 *
	 * @returns the simplified Chinese title information
	 */
	public getSimplifiedChineseApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[6];
	}

	/**
	 * Gets the SMDB Korean title information
	 *
	 * @returns the Korean title information
	 */
	public getKoreanApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[7];
	}

	/**
	 * Gets the SMDB Dutch title information
	 *
	 * @returns the Dutch title information
	 */
	public getDutchApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[8];
	}

	/**
	 * Gets the SMDB Portuguese title information
	 *
	 * @returns the Portuguese title information
	 */
	public getPortugueseApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[9];
	}

	/**
	 * Gets the SMDB Russian title information
	 *
	 * @returns the Russian title information
	 */
	public getRussianApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[10];
	}

	/**
	 * Gets the SMDB traditional Chinese title information
	 *
	 * @returns the traditional Chinese title information
	 */
	public getTraditionalChineseApplicationTitle(): SMDHApplicationTitle {
		return this.applicationTitles[11];
	}
}