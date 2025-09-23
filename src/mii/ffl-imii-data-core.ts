import BinaryParser from '@/binary-parser';
import FileStream from '@/file-stream';

export enum LOCKED_REGION {
	NONE,
	JPN,
	USA,
	EUR
}

export enum CHARACTER_SET {
	JPN_USA_EUR,
	CHN,
	KOR,
	TWN
}

type AUTHOR_TYPE = number; // TODO - What are these?

// * Uses the codenames because 3DS doesn't play nice here
export enum DEVICE_ORIGIN {
	RVL,
	NTR,
	CTR,
	WUP_NX
}

export enum GENDER {
	MALE,
	FEMALE
}

export enum FAVORITE_COLOR {
	RED,
	ORANGE,
	YELLOW,
	LIGHT_GREEN,
	GREEN,
	BLUE,
	LIGHT_BLUE,
	PINK,
	PURPLE,
	BROWN,
	WHITE,
	BLACK
}

// TODO - All the other color/type enums

export enum MOLE_TYPE {
	DISABLED,
	ENABLED
}

// * Names are taken straight from https://github.com/PretendoNetwork/mii-js
const coreParser = new BinaryParser()
	.uint8('version')
	.booleanBit('allowCopying')
	.booleanBit('profanityFlag')
	.bit2('regionLock')
	.bit2('characterSet')
	.skipBits(2)
	.bit4('pageIndex')
	.bit4('slotIndex')
	.bit4('unknown1')
	.bit3('deviceOrigin')
	.skipBits(1)
	.buffer('systemId', { length: 8 })
	.endianness('big')
	.booleanBit('normalMii')
	.booleanBit('dsMii')
	.booleanBit('nonUserMii')
	.booleanBit('isValid')
	.bit28('creationTime')
	.endianness('little')
	.buffer('consoleMAC', { length: 6 })
	.skip(2)
	.bit1('gender')
	.bit4('birthMonth')
	.bit5('birthDay')
	.bit4('favoriteColor')
	.booleanBit('favorite')
	.skipBits(1)
	.string('miiName', { length: 20, encoding: 'utf16le' })
	.uint8('height')
	.uint8('build')
	.booleanBit('disableSharing')
	.bit4('faceType')
	.bit3('skinColor')
	.bit4('wrinklesType')
	.bit4('makeupType')
	.uint8('hairType')
	.bit3('hairColor')
	.booleanBit('flipHair')
	.skipBits(4)
	.bit6('eyeType')
	.bit3('eyeColor')
	.bit4('eyeScale')
	.bit3('eyeVerticalStretch')
	.bit5('eyeRotation')
	.bit4('eyeSpacing')
	.bit5('eyeYPosition')
	.skipBits(2)
	.bit5('eyebrowType')
	.bit3('eyebrowColor')
	.bit4('eyebrowScale')
	.bit3('eyebrowVerticalStretch')
	.skipBits(1)
	.bit4('eyebrowRotation')
	.skipBits(1)
	.bit4('eyebrowSpacing')
	.bit5('eyebrowYPosition')
	.skipBits(2)
	.bit5('noseType')
	.bit4('noseScale')
	.bit5('noseYPosition')
	.skipBits(2)
	.bit6('mouthType')
	.bit3('mouthColor')
	.bit4('mouthScale')
	.bit3('mouthHorizontalStretch')
	.bit5('mouthYPosition')
	.bit3('mustacheType')
	.uint8('unknown2')
	.bit3('beardType')
	.bit3('facialHairColor')
	.bit4('mustacheScale')
	.bit5('mustacheYPosition')
	.skipBits(1)
	.bit4('glassesType')
	.bit3('glassesColor')
	.bit4('glassesScale')
	.bit5('glassesYPosition')
	.bit1('moleEnabled')
	.bit4('moleScale')
	.bit5('moleXPosition')
	.bit5('moleYPosition');

const createIDParser = new BinaryParser()
	.endianness('big')
	.booleanBit('normalMii')
	.booleanBit('dsMii')
	.booleanBit('nonUserMii')
	.booleanBit('isValid')
	.bit28('creationTime')
	.endianness('little')
	.buffer('consoleMAC', { length: 6 });

// * Decorator for automatically creating getters and setters for the parsed data
function mapToDecoded(decodedPath: string) {
	return function(_target: unknown, context: ClassFieldDecoratorContext): void {
		const propertyKey = context.name as string;
		const pathParts = decodedPath.split('.');

		context.addInitializer(function() {
			Object.defineProperty(this, propertyKey, {
				get() {
					let value = (this as Record<string, unknown>).decoded;
					for (const part of pathParts) {
						value = (value as Record<string, unknown>)?.[part];
					}
					return value;
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
					current[finalKey] = newValue;
				},
				enumerable: true,
				configurable: true
			});
		});
	};
}

// TODO - Hook this up to something like Arian's WASM port of FFL?

export default class FFLiMiiDataCore {
	private stream: FileStream;
	private decoded!: ReturnType<typeof BinaryParser.infer<typeof coreParser>>;

	/**
	 * The Mii data version. Always 3, unless the Mii was made
	 * with the Wii U GamePad camera, in which case 0.
	 */
	@mapToDecoded('version')
	public miiVersion: number;

	/**
	 * If set, the Mii can be copied.
	 */
	@mapToDecoded('allowCopying')
	public copyable: boolean;

	/**
	 * If set, this means the Mii contains profanity in either
	 * the Mii name or creator name. If set, both the Mii name
	 * and creator name are replaced with "???".
	 */
	@mapToDecoded('profanityFlag')
	public ngWord: boolean;

	/**
	 * If set, this locks the Mii to a specific region.
	 */
	@mapToDecoded('regionLock')
	public regionMove: LOCKED_REGION;

	/**
	 * Denotes the font type that should be used for strings.
	 */
	@mapToDecoded('characterSet')
	public fontRegion: CHARACTER_SET;

	/**
	 * The room ID the Mii is in when using Mii Maker.
	 */
	@mapToDecoded('pageIndex')
	public roomIndex: number;

	/**
	 * The slot ID the Mii is in when using Mii Maker.
	 */
	@mapToDecoded('slotIndex')
	public positionInRoom: number;

	/**
	 * Unknown.
	 */
	@mapToDecoded('unknown1')
	public authorType: AUTHOR_TYPE;

	/**
	 * Denotes the platform the Mii was created on.
	 */
	@mapToDecoded('deviceOrigin')
	public birthPlatform: DEVICE_ORIGIN;

	/**
	 * Identifies the owner of the Mii, editing restrictions and blue pants.
	 * In older Mii formats, this was tied to the console MAC. This is no
	 * longer the case.
	 */
	@mapToDecoded('systemId')
	public authorID: Buffer;

	/**
	 * In the original implementation, this contains additional flags and metadata.
	 * In more recent implementations, this is random data.
	 */
	public get createID(): Buffer {
		return createIDParser.encode({
			creationTime: this.creationDate,
			isValid: this.isValid,
			nonUserMii: this.isNonUserMii,
			dsMii: this.isDSi,
			normalMii: this.isNormalMii,
			consoleMAC: this.creatorMAC
		});
	}

	public set createID(createID: Buffer) {
		const decoded = createIDParser.parse(createID);

		this.creationDate = decoded.creationTime;
		this.isValid = decoded.isValid;
		this.isNonUserMii = decoded.nonUserMii;
		this.isDSi = decoded.dsMii;
		this.isNormalMii = decoded.normalMii;
		this.creatorMAC = decoded.consoleMAC;
	}

	/**
	 * The date the Mii was created, in seconds divided by 2, since 01/01/2010 00:00:00.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('normalMii')
	public creationDate: number;

	/**
	 * If set, the Mii is considered valid. If not, the Mii is considered invalid.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('dsMii')
	public isValid: boolean;

	/**
	 * If set, this Mii is either a temporary Mii made by an application (such as an NPC),
	 * or this is a developer Mii made on a dev unit.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('nonUserMii')
	public isNonUserMii: boolean;

	/**
	 * If set, this Mii was created on a DSi.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('isValid')
	public isDSi: boolean;

	/**
	 * If set, this Mii will NOT have the "special Mii" gold pants.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('creationTime')
	public isNormalMii: boolean;

	/**
	 * The MAC address of the console the Mii was made on.
	 * This is part of the "createID" in the original implementation, and
	 * should not be relied on since more recent implementations of "createID"
	 * set this to random data.
	 */
	@mapToDecoded('consoleMAC')
	public creatorMAC: Buffer;

	/**
	 * Denotes the Miis gender.
	 */
	@mapToDecoded('gender')
	public gender: GENDER;

	/**
	 * Denotes the Miis birth month.
	 */
	@mapToDecoded('birthMonth')
	public birthMonth: number;

	/**
	 * Denotes the Miis birth day.
	 */
	@mapToDecoded('birthDay')
	public birthDay: number;

	/**
	 * Denotes the Miis shirt color.
	 */
	@mapToDecoded('favoriteColor')
	public favoriteColor: FAVORITE_COLOR;

	/**
	 * If set, this Mii is considered a users "favorite".
	 */
	@mapToDecoded('favorite')
	public favorite: boolean;

	/**
	 * Mii name. UTF-16 encoded, up to 10 characters with "0000" padding
	 */
	@mapToDecoded('miiName')
	public name: string;

	/**
	 * Height of the Mii
	 */
	@mapToDecoded('height')
	public height: number;

	/**
	 * Thickness of the Mii
	 */
	@mapToDecoded('build')
	public build: number;

	/**
	 * If set, the Mii cannot be shared via StreetPass. If the Mii has "isNormalMii",
	 * it MUST have this flag set. Special Miis are not permitted to be shared.
	 */
	@mapToDecoded('disableSharing')
	public localOnly: boolean;

	/**
	 * Mii head shape ID.
	 */
	@mapToDecoded('faceType')
	public faceType: number;

	/**
	 * Mii skin color ID.
	 */
	@mapToDecoded('skinColor')
	public faceColor: number;

	/**
	 * Mii wrinkles type ID.
	 */
	@mapToDecoded('wrinklesType')
	public faceTex: number;

	/**
	 * Mii makeup type ID.
	 */
	@mapToDecoded('makeupType')
	public faceMake: number;

	/**
	 * Mii hair type ID.
	 */
	@mapToDecoded('hairType')
	public hairType: number;

	/**
	 * Mii hair color ID.
	 */
	@mapToDecoded('hairColor')
	public hairColor: number;

	/**
	 * If set, mirror the Miis hair.
	 */
	@mapToDecoded('flipHair')
	public hairFlip: boolean;

	/**
	 * Mii eye type ID.
	 */
	@mapToDecoded('eyeType')
	public eyeType: number;

	/**
	 * Mii eye color ID.
	 */
	@mapToDecoded('eyeColor')
	public eyeColor: number;

	/**
	 * Mii eye scale.
	 */
	@mapToDecoded('eyeScale')
	public eyeScale: number;

	/**
	 * Mii eye height.
	 */
	@mapToDecoded('eyeVerticalStretch')
	public eyeAspect: number;

	/**
	 * Mii eye rotation amount.
	 */
	@mapToDecoded('eyeRotation')
	public eyeRotate: number;

	/**
	 * Mii eye X position.
	 */
	@mapToDecoded('eyeSpacing')
	public eyeX: number;

	/**
	 * Mii eye Y position.
	 */
	@mapToDecoded('eyeYPosition')
	public eyeY: number;

	/**
	 * Mii eyebrow type ID.
	 */
	@mapToDecoded('eyebrowType')
	public eyebrowType: number;

	/**
	 * Mii eyebrow color ID.
	 */
	@mapToDecoded('eyebrowColor')
	public eyebrowColor: number;

	/**
	 * Mii eyebrow scale.
	 */
	@mapToDecoded('eyebrowScale')
	public eyebrowScale: number;

	/**
	 * Mii eyebrow height.
	 */
	@mapToDecoded('eyebrowVerticalStretch')
	public eyebrowAspect: number;

	/**
	 * Mii eyebrow rotation amount.
	 */
	@mapToDecoded('eyebrowRotation')
	public eyebrowRotate: number;

	/**
	 * Mii eyebrow X position.
	 */
	@mapToDecoded('eyebrowSpacing')
	public eyebrowX: number;

	/**
	 * Mii eyebrow Y position.
	 */
	@mapToDecoded('eyebrowYPosition')
	public eyebrowY: number;

	/**
	 * Mii nose type ID.
	 */
	@mapToDecoded('noseType')
	public noseType: number;

	/**
	 * Mii nose scale.
	 */
	@mapToDecoded('noseScale')
	public noseScale: number;

	/**
	 * Mii nose Y position.
	 */
	@mapToDecoded('noseYPosition')
	public noseY: number;

	/**
	 * Mii mouth type ID.
	 */
	@mapToDecoded('mouthType')
	public mouthType: number;

	/**
	 * Mii mouth color ID.
	 */
	@mapToDecoded('mouthColor')
	public mouthColor: number;

	/**
	 * Mii mouth scale.
	 */
	@mapToDecoded('mouthScale')
	public mouthScale: number;

	/**
	 * Mii mouth height.
	 */
	@mapToDecoded('mouthHorizontalStretch')
	public mouthAspect: number;

	/**
	 * Mii mouth Y position.
	 */
	@mapToDecoded('mouthYPosition')
	public mouthY: number;

	/**
	 * Mii mustache type ID.
	 */
	@mapToDecoded('mustacheType')
	public mustacheType: number;

	/**
	 * Mii beard type ID.
	 */
	@mapToDecoded('beardType')
	public beardType: number;

	/**
	 * Mii facial hair color ID. Affects both beard and mustache.
	 */
	@mapToDecoded('facialHairColor')
	public beardColor: number;

	/**
	 * Mii mustache scale. Despite the name, this does not affect the beard in any way.
	 */
	@mapToDecoded('mustacheScale')
	public beardScale: number;

	/**
	 * Mii mustache Y position. Despite the name, this does not affect the beard in any way.
	 */
	@mapToDecoded('mustacheYPosition')
	public beardY: number;

	/**
	 * Mii glasses type ID.
	 */
	@mapToDecoded('glassesType')
	public glassType: number;

	/**
	 * Mii glasses color ID.
	 */
	@mapToDecoded('glassesColor')
	public glassColor: number;

	/**
	 * Mii glasses scale.
	 */
	@mapToDecoded('glassesScale')
	public glassScale: number;

	/**
	 * Mii glasses Y position.
	 */
	@mapToDecoded('glassesYPosition')
	public glassY: number;

	/**
	 * If set, the Miis mole is visible.
	 */
	@mapToDecoded('moleEnabled')
	public moleType: MOLE_TYPE;

	/**
	 * Mii mole scale.
	 */
	@mapToDecoded('moleScale')
	public moleScale: number;

	/**
	 * Mii mole X position.
	 */
	@mapToDecoded('moleXPosition')
	public moleX: number;

	/**
	 * Mii mole Y position.
	 */
	@mapToDecoded('moleYPosition')
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
			throw new Error(`Invalid ${this.constructor.name} size. Expected 72 bytes, got ${size}`);
		}

		this.decoded = coreParser.parse(this.stream.readBytes(0x48));
	}
}

// * Aliases. No functionality differences, just purely for different visual contexts

export class CFLiPackedMiiDataCore extends FFLiMiiDataCore {}
export class CFLiRFLMiiDataCore extends FFLiMiiDataCore {}