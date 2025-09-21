import { Parser } from 'binary-parser';
import FileStream from '@/file-stream';

const field0x01Parser = new Parser()
	.bit2('unused')
	.bit2('characterSet')
	.bit2('regionLock')
	.bit1('hasProfanity')
	.bit1('allowCopying');

const field0x02Parser = new Parser()
	.bit4('slotIndex')
	.bit4('pageIndex');

const field0x03Parser = new Parser()
	.bit1('unused')
	.bit3('deviceOrigin')
	.bit4('unknown');

const field0x0CParser = new Parser()
	.endianness('big')
	.bit1('isNormalMii')
	.bit1('isDSi')
	.bit1('isNonUserMii')
	.bit1('isValid')
	.bit28('creationDate');

const field0x18Parser = new Parser()
	.bit1('unused')
	.bit1('isFavorite')
	.bit4('favoriteColor')
	.bit5('birthDay')
	.bit4('birthMonth')
	.bit1('sex');

const field0x2EParser = new Parser()
	.uint8('width')
	.uint8('height');

const field0x30Parser = new Parser()
	.bit3('skinColor')
	.bit4('faceShape')
	.bit1('disableSharing');

const field0x31Parser = new Parser()
	.bit4('makeup')
	.bit4('wrinkles');

const field0x33Parser = new Parser()
	.bit4('unused')
	.bit1('flipHair')
	.bit3('hairColor');

const field0x34Parser = new Parser()
	.bit2('unused')
	.bit5('eyeYPosition')
	.bit4('eyeXSpacing')
	.bit5('eyeRotation')
	.bit3('eyeYScale')
	.bit4('eyeScale')
	.bit3('eyeColor')
	.bit6('eyeStyle');

const field0x38Parser = new Parser()
	.bit2('unused3')
	.bit5('eyebrowYPosition')
	.bit4('eyebrowXSpacing')
	.bit1('unused2')
	.bit4('eyebrowRotation')
	.bit1('unused1')
	.bit3('eyebrowYScale')
	.bit4('eyebrowScale')
	.bit3('eyebrowColor')
	.bit5('eyebrowStyle');

const field0x3CParser = new Parser()
	.bit2('unused')
	.bit5('noseYPosition')
	.bit4('noseScale')
	.bit5('noseStyle');

const field0x3EParser = new Parser()
	.bit3('mouthYScale')
	.bit4('mouthScale')
	.bit3('mouthColor')
	.bit6('mouthStyle');

const field0x40Parser = new Parser()
	.bit8('unused')
	.bit3('mustacheStyle')
	.bit5('mouthYPosition');

const field0x42Parser = new Parser()
	.bit1('unused')
	.bit5('mustacheYPosition')
	.bit4('mustacheScale')
	.bit3('beardColor')
	.bit3('beardStyle');

const field0x44Parser = new Parser()
	.bit5('glassesYPosition')
	.bit4('glassesScale')
	.bit3('glassesColor')
	.bit4('glassesStyle');

const field0x46Parser = new Parser()
	.bit1('unused')
	.bit5('moleYPosition')
	.bit5('moleXPosition')
	.bit4('moleScale')
	.bit1('enableMole');

const coreParser = new Parser()
	.endianness('little')
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

const createIDParser = new Parser()
	.nest('field0x0C', { type: field0x0CParser })
	.buffer('mac', { length: 6 });

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
		isValid: number;
		isNonUserMii: number;
		isDSi: number;
		isNormalMii: number;
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

	/**
	 * The Mii data version. Always 3, unless the Mii was made
	 * with the Wii U GamePad camera, in which case 0.
	 */
	@mapToDecoded('field0x00')
	public miiVersion: number;

	/**
	 * If set, the Mii can be copied.
	 */
	@mapToDecoded('field0x01.allowCopying', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public copyable: boolean;

	/**
	 * If set, this means the Mii contains profanity in either
	 * the Mii name or creator name. If set, both the Mii name
	 * and creator name are replaced with "???".
	 */
	@mapToDecoded('field0x01.hasProfanity', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public ngWord: boolean;

	/**
	 * If set, this locks the Mii to a specific region.
	 */
	@mapToDecoded('field0x01.regionLock')
	public regionMove: number;

	/**
	 * Denotes the font type that should be used for strings.
	 */
	@mapToDecoded('field0x01.characterSet')
	public fontRegion: number;

	/**
	 * The room ID the Mii is in when using Mii Maker.
	 */
	@mapToDecoded('field0x02.pageIndex')
	public roomIndex: number;

	/**
	 * The slot ID the Mii is in when using Mii Maker.
	 */
	@mapToDecoded('field0x02.slotIndex')
	public positionInRoom: number;

	/**
	 * Unknown.
	 */
	@mapToDecoded('field0x03.unknown')
	public authorType: number;

	/**
	 * Denotes the platform the Mii was created on.
	 */
	@mapToDecoded('field0x03.deviceOrigin')
	public birthPlatform: number;

	/**
	 * Identifies the owner of the Mii, editing restrictions and blue pants.
	 * In older Mii formats, this was tied to the console MAC. This is no
	 * longer the case.
	 */
	@mapToDecoded('field0x04')
	public authorID: Buffer;

	/**
	 * In the original implementation, this contains additional flags and metadata.
	 * In more recent implementations, this is random data.
	 */
	public get createID(): Buffer {
		return createIDParser.encode({
			field0x0C: {
				creationDate: this.creationDate,
				isValid: this.isValid,
				isNonUserMii: this.isNonUserMii,
				isDSi: this.isDSi,
				isNormalMii: this.isNormalMii,
			},
			mac: this.creatorMAC
		});
	}

	public set createID(createID: Buffer) {
		const decoded = createIDParser.parse(createID);

		this.creationDate = decoded.field0x0C.creationDate;
		this.isValid = decoded.field0x0C.isValid;
		this.isNonUserMii = decoded.field0x0C.isNonUserMii;
		this.isDSi = decoded.field0x0C.isDSi;
		this.isNormalMii = decoded.field0x0C.isNormalMii;
		this.creatorMAC = decoded.mac;
	}

	/**
	 * The date the Mii was created, in seconds since 01/01/2010 00:00:00.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('field0x0C.creationDate')
	public creationDate: number;

	/**
	 * If set, the Mii is considered valid. If not, the Mii is considered invalid.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('field0x0C.isValid', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public isValid: boolean;

	/**
	 * If set, this Mii is either a temporary Mii made by an application (such as an NPC),
	 * or this is a developer Mii made on a dev unit.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('field0x0C.isNonUserMii', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public isNonUserMii: boolean;

	/**
	 * If set, this Mii was created on a DSi.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('field0x0C.isDSi', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public isDSi: boolean;

	/**
	 * If set, this Mii will NOT have the "special Mii" gold pants.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('field0x0C.isNormalMii', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public isNormalMii: boolean;

	/**
	 * The MAC address of the console the Mii was made on.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('field0x10')
	public creatorMAC: Buffer;

	/**
	 * Denotes the Miis gender.
	 */
	@mapToDecoded('field0x18.sex')
	public gender: number;

	/**
	 * Denotes the Miis birth month.
	 */
	@mapToDecoded('field0x18.birthMonth')
	public birthMonth: number;

	/**
	 * Denotes the Miis birth day.
	 */
	@mapToDecoded('field0x18.birthDay')
	public birthDay: number;

	/**
	 * Denotes the Miis shirt color.
	 */
	@mapToDecoded('field0x18.favoriteColor')
	public favoriteColor: number;

	/**
	 * If set, this Mii is considered a users "favorite".
	 */
	@mapToDecoded('field0x18.isFavorite', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public favorite: boolean;

	/**
	 * Mii name. UTF-16 encoded, up to 10 characters with "0000" padding
	 */
	@mapToDecoded('field0x1A')
	public name: string;

	/**
	 * Height of the Mii
	 */
	@mapToDecoded('field0x2E.height')
	public height: number;

	/**
	 * Thickness of the Mii
	 */
	@mapToDecoded('field0x2E.width')
	public build: number;

	/**
	 * If set, the Mii cannot be shared via StreetPass. If the Mii has "isNormalMii",
	 * it MUST have this flag set. Special Miis are not permitted to be shared.
	 */
	@mapToDecoded('field0x30.disableSharing', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public localOnly: boolean;

	/**
	 * Mii head shape ID.
	 */
	@mapToDecoded('field0x30.faceShape')
	public faceType: number;

	/**
	 * Mii skin color ID.
	 */
	@mapToDecoded('field0x30.skinColor')
	public faceColor: number;

	/**
	 * Mii wrinkles type ID.
	 */
	@mapToDecoded('field0x31.wrinkles')
	public faceTex: number;

	/**
	 * Mii makeup type ID.
	 */
	@mapToDecoded('field0x31.makeup')
	public faceMake: number;

	/**
	 * Mii hair type ID.
	 */
	@mapToDecoded('field0x32')
	public hairType: number;

	/**
	 * Mii hair color ID.
	 */
	@mapToDecoded('field0x33.hairColor')
	public hairColor: number;

	/**
	 * If set, mirror the Miis hair.
	 */
	@mapToDecoded('field0x33.flipHair', {
		get: (value: unknown) => !!value,
		set: (value: unknown) => value ? 1 : 0
	})
	public hairFlip: boolean;

	/**
	 * Mii eye type ID.
	 */
	@mapToDecoded('field0x34.eyeStyle')
	public eyeType: number;

	/**
	 * Mii eye color ID.
	 */
	@mapToDecoded('field0x34.eyeColor')
	public eyeColor: number;

	/**
	 * Mii eye scale.
	 */
	@mapToDecoded('field0x34.eyeScale')
	public eyeScale: number;

	/**
	 * Mii eye height.
	 */
	@mapToDecoded('field0x34.eyeYScale')
	public eyeAspect: number;

	/**
	 * Mii eye rotation amount.
	 */
	@mapToDecoded('field0x34.eyeRotation')
	public eyeRotate: number;

	/**
	 * Mii eye X position.
	 */
	@mapToDecoded('field0x34.eyeXSpacing')
	public eyeX: number;

	/**
	 * Mii eye Y position.
	 */
	@mapToDecoded('field0x34.eyeYPosition')
	public eyeY: number;

	/**
	 * Mii eyebrow type ID.
	 */
	@mapToDecoded('field0x38.eyebrowStyle')
	public eyebrowType: number;

	/**
	 * Mii eyebrow color ID.
	 */
	@mapToDecoded('field0x38.eyebrowColor')
	public eyebrowColor: number;

	/**
	 * Mii eyebrow scale.
	 */
	@mapToDecoded('field0x38.eyebrowScale')
	public eyebrowScale: number;

	/**
	 * Mii eyebrow height.
	 */
	@mapToDecoded('field0x38.eyebrowYScale')
	public eyebrowAspect: number;

	/**
	 * Mii eyebrow rotation amount.
	 */
	@mapToDecoded('field0x38.eyebrowRotation')
	public eyebrowRotate: number;

	/**
	 * Mii eyebrow X position.
	 */
	@mapToDecoded('field0x38.eyebrowXSpacing')
	public eyebrowX: number;

	/**
	 * Mii eyebrow Y position.
	 */
	@mapToDecoded('field0x38.eyebrowYPosition')
	public eyebrowY: number;

	/**
	 * Mii nose type ID.
	 */
	@mapToDecoded('field0x3C.noseStyle')
	public noseType: number;

	/**
	 * Mii nose scale.
	 */
	@mapToDecoded('field0x3C.noseScale')
	public noseScale: number;

	/**
	 * Mii nose Y position.
	 */
	@mapToDecoded('field0x3C.noseYPosition')
	public noseY: number;

	/**
	 * Mii mouth type ID.
	 */
	@mapToDecoded('field0x3E.mouthStyle')
	public mouthType: number;

	/**
	 * Mii mouth color ID.
	 */
	@mapToDecoded('field0x3E.mouthColor')
	public mouthColor: number;

	/**
	 * Mii mouth scale.
	 */
	@mapToDecoded('field0x3E.mouthScale')
	public mouthScale: number;

	/**
	 * Mii mouth height.
	 */
	@mapToDecoded('field0x3E.mouthYScale')
	public mouthAspect: number;

	/**
	 * Mii mouth Y position.
	 */
	@mapToDecoded('field0x40.mouthYPosition')
	public mouthY: number;

	/**
	 * Mii mustache type ID.
	 */
	@mapToDecoded('field0x40.mustacheStyle')
	public mustacheType: number;

	/**
	 * Mii beard type ID.
	 */
	@mapToDecoded('field0x42.beardStyle')
	public beardType: number;

	/**
	 * Mii facial hair color ID. Affects both beard and mustache.
	 */
	@mapToDecoded('field0x42.beardColor')
	public beardColor: number;

	/**
	 * Mii mustache scale. Despite the name, this does not affect the beard in any way.
	 */
	@mapToDecoded('field0x42.mustacheScale')
	public beardScale: number;

	/**
	 * Mii mustache Y position. Despite the name, this does not affect the beard in any way.
	 */
	@mapToDecoded('field0x42.mustacheYPosition')
	public beardY: number;

	/**
	 * Mii glasses type ID.
	 */
	@mapToDecoded('field0x44.glassesStyle')
	public glassType: number;

	/**
	 * Mii glasses color ID.
	 */
	@mapToDecoded('field0x44.glassesColor')
	public glassColor: number;

	/**
	 * Mii glasses scale.
	 */
	@mapToDecoded('field0x44.glassesScale')
	public glassScale: number;

	/**
	 * Mii glasses Y position.
	 */
	@mapToDecoded('field0x44.glassesYPosition')
	public glassY: number;

	/**
	 * If set, the Miis mole is visible.
	 */
	@mapToDecoded('field0x46.enableMole')
	public moleType: number;

	/**
	 * Mii mole scale.
	 */
	@mapToDecoded('field0x46.moleScale')
	public moleScale: number;

	/**
	 * Mii mole X position.
	 */
	@mapToDecoded('field0x46.moleXPosition')
	public moleX: number;

	/**
	 * Mii mole Y position.
	 */
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