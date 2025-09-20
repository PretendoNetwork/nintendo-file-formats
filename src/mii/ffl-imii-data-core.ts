import { Parser } from 'binary-parser';
import FileStream from '@/file-stream';

const field0x01Parser = new Parser()
	.bit1('allowCopying')
	.bit1('hasProfanity')
	.bit2('regionLock')
	.bit2('characterSet')
	.bit2('unused');

const field0x02Parser = new Parser()
	.bit4('pageIndex')
	.bit4('slotIndex');

const field0x03Parser = new Parser()
	.bit4('unknown')
	.bit3('deviceOrigin')
	.bit1('unused');

const field0x0CParser = new Parser()
	.endianness('big')
	.bit28('creationDate')
	.bit1('alwaysSet')
	.bit1('isTemporary')
	.bit1('isDSi')
	.bit1('isSpecialInverted');

const field0x18Parser = new Parser()
	.bit1('sex')
	.bit4('birthMonth')
	.bit5('birthDay')
	.bit4('favoriteColor')
	.bit1('isFavorite')
	.bit1('unused');

const field0x2EParser = new Parser()
	.uint8('width')
	.uint8('height');

const field0x30Parser = new Parser()
	.bit1('disableSharing')
	.bit4('faceShape')
	.bit3('skinColor');

const field0x31Parser = new Parser()
	.bit4('wrinkles')
	.bit4('makeup');

const field0x33Parser = new Parser()
	.bit3('hairColor')
	.bit1('flipHair')
	.bit4('unused');

const field0x34Parser = new Parser()
	.bit6('eyeStyle')
	.bit3('eyeColor')
	.bit4('eyeScale')
	.bit3('eyeYScale')
	.bit5('eyeRotation')
	.bit4('eyeXSpacing')
	.bit5('eyeYPosition')
	.bit2('unused');

const field0x38Parser = new Parser()
	.bit5('eyebrowStyle')
	.bit3('eyebrowColor')
	.bit4('eyebrowScale')
	.bit3('eyebrowYScale')
	.bit1('unused1')
	.bit4('eyebrowRotation')
	.bit1('unused2')
	.bit4('eyebrowXSpacing')
	.bit5('eyebrowYPosition')
	.bit2('unused3');

const field0x3CParser = new Parser()
	.bit5('noseStyle')
	.bit4('noseScale')
	.bit5('noseYPosition')
	.bit2('unused');

const field0x3EParser = new Parser()
	.bit6('mouthStyle')
	.bit3('mouthColor')
	.bit4('mouthScale')
	.bit3('mouthYScale');

const field0x40Parser = new Parser()
	.bit5('mouthYPosition')
	.bit3('mustacheStyle')
	.bit8('unused');

const field0x42Parser = new Parser()
	.bit3('beardStyle')
	.bit3('beardColor')
	.bit4('mustacheScale')
	.bit5('mustacheYPosition')
	.bit1('unused');

const field0x44Parser = new Parser()
	.bit4('glassesStyle')
	.bit3('glassesColor')
	.bit4('glassesScale')
	.bit5('glassesYPosition');

const field0x46Parser = new Parser()
	.bit1('enableMole')
	.bit4('moleScale')
	.bit5('moleXPosition')
	.bit5('moleYPosition')
	.bit1('unused');

// * The binary-parser encoder fork can't write bit
// * fields larger than 32 bits, and has no way of
// * marking a bit field as "ended" to start a new
// * one. So all bit definitions are treated as the
// * same singular bit field. To get around this, we
// * have to use nested parsers. A bit messy, but it
// * works good enough. Also since some data spans
// * multiple bytes/bit fields, for consistency I've
// * chosen to just name every top-level field after
// * its byte offset. We can map the values later
const coreParser = new Parser()
	.uint8('field0x00')
	.nest('field0x01', { type: field0x01Parser })
	.nest('field0x02', { type: field0x02Parser })
	.nest('field0x03', { type: field0x03Parser })
	.buffer('field0x04', { length: 8 })
	.nest('field0x0C', { type: field0x0CParser })
	.buffer('field0x10', { length: 6 })
	.skip(2)
	.nest('field0x18', { type: field0x18Parser })
	.string('field0x1A', { length: 20, encoding: 'utf-16le', stripNull: true })
	.nest('field0x2E', { type: field0x2EParser })
	.nest('field0x30', { type: field0x30Parser })
	.nest('field0x31', { type: field0x31Parser })
	.uint8('field0x32')
	.nest('field0x33', { type: field0x33Parser })
	.nest('field0x34', { type: field0x34Parser })
	.nest('field0x38', { type: field0x38Parser })
	.nest('field0x3C', { type: field0x3CParser })
	.nest('field0x3E', { type: field0x3EParser })
	.nest('field0x40', { type: field0x40Parser })
	.nest('field0x42', { type: field0x42Parser })
	.nest('field0x44', { type: field0x44Parser })
	.nest('field0x46', { type: field0x46Parser });

export default class FFLiMiiDataCore {
	private stream: FileStream;
	private decoded = {};

	/**
	 * Parses the FFLiMiiDataCore from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public parseFromFile(fdOrPath: number | string): void {
		this.stream = new FileStream(fdOrPath);
		this.parse();
	}

	/**
	 * Parses the FFLiMiiDataCore from the provided `buffer`
	 *
	 * @param buffer - FFLiMiiDataCore data buffer
	 */
	public parseFromBuffer(buffer: Buffer): void {
		this.stream = new FileStream(buffer);
		this.parse();
	}

	/**
	 * Parses the FFLiMiiDataCore from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded FFLiMiiDataCore data
	 */
	public parseFromString(base64: string): void {
		this.parseFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Parses the FFLiMiiDataCore from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `FFLiMiiDataCore` and
	 * parses the FFLiMiiDataCore from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public static fromFile(fdOrPath: number | string): FFLiMiiDataCore {
		const ffliMiiDataCore = new FFLiMiiDataCore();
		ffliMiiDataCore.parseFromFile(fdOrPath);

		return ffliMiiDataCore;
	}

	/**
	 * Creates a new instance of `FFLiMiiDataCore` and
	 * parses the FFLiMiiDataCore from the provided `buffer`
	 *
	 * @param buffer - FFLiMiiDataCore data buffer
	 */
	public static fromBuffer(buffer: Buffer): FFLiMiiDataCore {
		const ffliMiiDataCore = new FFLiMiiDataCore();
		ffliMiiDataCore.parseFromBuffer(buffer);

		return ffliMiiDataCore;
	}

	/**
	 * Creates a new instance of `FFLiMiiDataCore` and
	 * parses the FFLiMiiDataCore from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded FFLiMiiDataCore data
	 */
	public static fromString(base64: string): FFLiMiiDataCore {
		const ffliMiiDataCore = new FFLiMiiDataCore();
		ffliMiiDataCore.parseFromString(base64);

		return ffliMiiDataCore;
	}

	/**
	 * Creates a new instance of `FFLiMiiDataCore` and
	 * parses the FFLiMiiDataCore from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): FFLiMiiDataCore {
		const ffliMiiDataCore = new FFLiMiiDataCore();
		ffliMiiDataCore.parseFromFileStream(stream);

		return ffliMiiDataCore;
	}

	/**
	 * Encodes the FFLiMiiDataCore data into a Buffer
	 *
	 * @returns encoded FFLiMiiDataCore
	 */
	public bytes(): Buffer {
		return coreParser.encode(this.decoded);
	}

	private parse(): void {
		const size = this.stream.remaining();

		if (size !== 0x48) {
			throw new Error(`Invalid FFLiMiiDataCore size. Expected 72 bytes, got ${size}`);
		}

		this.decoded = coreParser.parse(this.stream.readBytes(0x48));
	}
}