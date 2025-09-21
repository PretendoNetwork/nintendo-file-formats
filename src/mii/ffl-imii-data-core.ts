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

type DecodedFFLiMiiDataCore = {
	field0x00: number;
	field0x01: {
		allowCopying: number;
		hasProfanity: number;
		regionLock: number;
		characterSet: number;
		unused: number;
	};
	field0x02: {
		pageIndex: number;
		slotIndex: number;
	};
	field0x03: {
		unknown: number;
		deviceOrigin: number;
		unused: number;
	};
	field0x04: Buffer;
	field0x0C: {
		creationDate: number;
		alwaysSet: number;
		isTemporary: number;
		isDSi: number;
		isSpecialInverted: number;
	};
	field0x10: Buffer;
	field0x18: {
		sex: number;
		birthMonth: number;
		birthDay: number;
		favoriteColor: number;
		isFavorite: number;
		unused: number;
	};
	field0x1A: string;
	field0x2E: {
		width: number;
		height: number;
	};
	field0x30: {
		disableSharing: number;
		faceShape: number;
		skinColor: number;
	};
	field0x31: {
		wrinkles: number;
		makeup: number;
	};
	field0x32: number;
	field0x33: {
		hairColor: number;
		flipHair: number;
		unused: number;
	};
	field0x34: {
		eyeStyle: number;
		eyeColor: number;
		eyeScale: number;
		eyeYScale: number;
		eyeRotation: number;
		eyeXSpacing: number;
		eyeYPosition: number;
		unused: number;
	};
	field0x38: {
		eyebrowStyle: number;
		eyebrowColor: number;
		eyebrowScale: number;
		eyebrowYScale: number;
		unused1: number;
		eyebrowRotation: number;
		unused2: number;
		eyebrowXSpacing: number;
		eyebrowYPosition: number;
		unused3: number;
	};
	field0x3C: {
		noseStyle: number;
		noseScale: number;
		noseYPosition: number;
		unused: number;
	};
	field0x3E: {
		mouthStyle: number;
		mouthColor: number;
		mouthScale: number;
		mouthYScale: number;
	};
	field0x40: {
		mouthYPosition: number;
		mustacheStyle: number;
		unused: number;
	};
	field0x42: {
		beardStyle: number;
		beardColor: number;
		mustacheScale: number;
		mustacheYPosition: number;
		unused: number;
	};
	field0x44: {
		glassesStyle: number;
		glassesColor: number;
		glassesScale: number;
		glassesYPosition: number;
	};
	field0x46: {
		enableMole: number;
		moleScale: number;
		moleXPosition: number;
		moleYPosition: number;
		unused: number;
	};
};

// * Decorator for automatically creating getters and setters for the parsed data
function mapToDecoded(decodedPath: string, options?: {
	get?: (value: unknown) => unknown;
	set?: (value: unknown) => unknown;
}) {
	return function(target: unknown, context: ClassFieldDecoratorContext): void {
		const propertyKey = context.name as string;
		const pathParts = decodedPath.split('.');

		context.addInitializer(function() {
			Object.defineProperty(this, propertyKey, {
				get() {
					let value = (this as Record<string, unknown>).decoded;
					for (const part of pathParts) {
						value = (value as Record<string, unknown>)?.[part];
					}
					return options?.get ? options.get(value) : value;
				},
				set(newValue) {
					let current = (this as Record<string, unknown>).decoded as Record<string, unknown>;
					for (let i = 0; i < pathParts.length - 1; i++) {
						const part = pathParts[i];
						if (!(part in current)) {
							current[part] = {};
						}
						current = current[part] as Record<string, unknown>;
					}
					const finalKey = pathParts[pathParts.length - 1];
					current[finalKey] = options?.set ? options.set(newValue) : newValue;
				},
				enumerable: true,
				configurable: true
			});
		});
	};
}

export default class FFLiMiiDataCore {
	private stream: FileStream;
	private decoded!: DecodedFFLiMiiDataCore;

	@mapToDecoded('field0x00')
	public miiVersion: number;

	@mapToDecoded('field0x01.allowCopying', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public copyable: boolean;

	@mapToDecoded('field0x01.hasProfanity', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public ngWord: boolean;

	@mapToDecoded('field0x01.regionLock')
	public regionMove: number;

	@mapToDecoded('field0x01.characterSet')
	public fontRegion: number;

	@mapToDecoded('field0x02.pageIndex')
	public roomIndex: number;

	@mapToDecoded('field0x02.slotIndex')
	public positionInRoom: number;

	@mapToDecoded('field0x03.unknown')
	public authorType: number;

	@mapToDecoded('field0x03.deviceOrigin')
	public birthPlatform: number;

	@mapToDecoded('field0x04')
	public authorID: Buffer;

	@mapToDecoded('field0x0C.creationDate')
	public creationDate: number;

	@mapToDecoded('field0x0C.alwaysSet', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public alwaysSet: boolean;

	@mapToDecoded('field0x0C.isTemporary', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public isTemporary: boolean;

	@mapToDecoded('field0x0C.isDSi', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public isDSi: boolean;

	@mapToDecoded('field0x0C.isSpecialInverted', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public isSpecialInverted: boolean;

	@mapToDecoded('field0x10')
	public creatorMAC: Buffer;

	@mapToDecoded('field0x18.sex')
	public gender: number;

	@mapToDecoded('field0x18.birthMonth')
	public birthMonth: number;

	@mapToDecoded('field0x18.birthDay')
	public birthDay: number;

	@mapToDecoded('field0x18.favoriteColor')
	public favoriteColor: number;

	@mapToDecoded('field0x18.isFavorite', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public favorite: boolean;

	@mapToDecoded('field0x1A')
	public name: string;

	@mapToDecoded('field0x2E.height')
	public height: number;

	@mapToDecoded('field0x2E.width')
	public build: number;

	@mapToDecoded('field0x30.disableSharing', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public localOnly: boolean;

	@mapToDecoded('field0x30.faceShape')
	public faceType: number;

	@mapToDecoded('field0x30.skinColor')
	public faceColor: number;

	@mapToDecoded('field0x31.wrinkles')
	public faceTex: number;

	@mapToDecoded('field0x31.makeup')
	public faceMake: number;

	@mapToDecoded('field0x32')
	public hairType: number;

	@mapToDecoded('field0x33.hairColor')
	public hairColor: number;

	@mapToDecoded('field0x33.flipHair', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public hairFlip: boolean;

	@mapToDecoded('field0x34.eyeStyle')
	public eyeType: number;

	@mapToDecoded('field0x34.eyeColor')
	public eyeColor: number;

	@mapToDecoded('field0x34.eyeScale')
	public eyeScale: number;

	@mapToDecoded('field0x34.eyeYScale')
	public eyeAspect: number;

	@mapToDecoded('field0x34.eyeRotation')
	public eyeRotate: number;

	@mapToDecoded('field0x34.eyeXSpacing')
	public eyeX: number;

	@mapToDecoded('field0x34.eyeYPosition')
	public eyeY: number;

	@mapToDecoded('field0x38.eyebrowStyle')
	public eyebrowType: number;

	@mapToDecoded('field0x38.eyebrowColor')
	public eyebrowColor: number;

	@mapToDecoded('field0x38.eyebrowScale')
	public eyebrowScale: number;

	@mapToDecoded('field0x38.eyebrowYScale')
	public eyebrowAspect: number;

	@mapToDecoded('field0x38.eyebrowRotation')
	public eyebrowRotate: number;

	@mapToDecoded('field0x38.eyebrowXSpacing')
	public eyebrowX: number;

	@mapToDecoded('field0x38.eyebrowYPosition')
	public eyebrowY: number;

	@mapToDecoded('field0x3C.noseStyle')
	public noseType: number;

	@mapToDecoded('field0x3C.noseScale')
	public noseScale: number;

	@mapToDecoded('field0x3C.noseYPosition')
	public noseY: number;

	@mapToDecoded('field0x3E.mouthStyle')
	public mouthType: number;

	@mapToDecoded('field0x3E.mouthColor')
	public mouthColor: number;

	@mapToDecoded('field0x3E.mouthScale')
	public mouthScale: number;

	@mapToDecoded('field0x3E.mouthYScale')
	public mouthAspect: number;

	@mapToDecoded('field0x40.mouthYPosition')
	public mouthY: number;

	@mapToDecoded('field0x40.mustacheStyle')
	public mustacheType: number;

	@mapToDecoded('field0x42.beardStyle')
	public beardType: number;

	@mapToDecoded('field0x42.beardColor')
	public beardColor: number;

	@mapToDecoded('field0x42.mustacheScale')
	public beardScale: number;

	@mapToDecoded('field0x42.mustacheYPosition')
	public beardY: number;

	@mapToDecoded('field0x44.glassesStyle')
	public glassType: number;

	@mapToDecoded('field0x44.glassesColor')
	public glassColor: number;

	@mapToDecoded('field0x44.glassesScale')
	public glassScale: number;

	@mapToDecoded('field0x44.glassesYPosition')
	public glassY: number;

	@mapToDecoded('field0x46.enableMole', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public moleType: boolean;

	@mapToDecoded('field0x46.moleScale')
	public moleScale: number;

	@mapToDecoded('field0x46.moleXPosition')
	public moleX: number;

	@mapToDecoded('field0x46.moleYPosition')
	public moleY: number;

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