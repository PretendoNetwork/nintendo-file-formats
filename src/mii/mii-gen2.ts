import assert from 'node:assert';

// TODO - This class kinda sucks, simplify it? Also maybe merge this into a larger "BitStream" style class?
class BitReader {
	private byteIndex = 0;
	private bitIndex = 0;
	private buffer: Buffer;
	private bigEndian: boolean;

	constructor(buffer: Buffer, bigEndian = false) {
		this.buffer = buffer;
		this.bigEndian = bigEndian;
	}

	public readBits(n: number): number {
		let result = 0;
		if (!this.bigEndian) {
			// * Little endian: first bit read becomes bit0 of result
			for (let i = 0; i < n; i++) {
				if (this.byteIndex >= this.buffer.length) {
					throw new Error('Buffer too small for BitReader (little endian)');
				}

				const bit = (this.buffer[this.byteIndex] >> this.bitIndex) & 1;
				result |= bit << i;
				this.bitIndex++;

				if (this.bitIndex === 8) {
					this.bitIndex = 0;
					this.byteIndex++;
				}
			}
		} else {
			// * Big endian: first bit read becomes the most-significant bit of result
			for (let i = 0; i < n; i++) {
				if (this.byteIndex >= this.buffer.length) {
					throw new Error('Buffer too small for BitReader (big endian)');
				}

				const bit = (this.buffer[this.byteIndex] >> (7 - this.bitIndex)) & 1;
				result = (result << 1) | bit;
				this.bitIndex++;

				if (this.bitIndex === 8) {
					this.bitIndex = 0;
					this.byteIndex++;
				}
			}
		}

		return result;
	}
}

// TODO - This class kinda sucks, simplify it? Also maybe merge this into a larger "BitStream" style class?
class BitWriter {
	private byteIndex = 0;
	private bitIndex = 0;
	private buffer: Buffer;
	private bigEndian: boolean;

	constructor(buffer: Buffer, bigEndian = false) {
		this.buffer = buffer;
		this.bigEndian = bigEndian;
	}

	public writeBits(n: number, value: number): void {
		if (!this.bigEndian) {
			// * Little endian: first bit written becomes bit 0 of the written field
			for (let i = 0; i < n; i++) {
				if (this.byteIndex >= this.buffer.length) {
					throw new Error('Buffer too small for BitWriter (little endian)');
				}

				const bit = (value >> i) & 1;
				this.buffer[this.byteIndex] |= bit << this.bitIndex;
				this.bitIndex++;

				if (this.bitIndex === 8) {
					this.bitIndex = 0;
					this.byteIndex++;
				}
			}
		} else {
			// * Big endian: first bit written becomes the most–significant bit
			for (let i = 0; i < n; i++) {
				if (this.byteIndex >= this.buffer.length) {
					throw new Error('Buffer too small for BitWriter (big endian)');
				}

				const pos = 7 - this.bitIndex;
				const bit = (value >> (n - 1 - i)) & 1;
				this.buffer[this.byteIndex] |= bit << pos;
				this.bitIndex++;

				if (this.bitIndex === 8) {
					this.bitIndex = 0;
					this.byteIndex++;
				}
			}
		}
	}
}

// * Taken from https://github.com/PretendoNetwork/mii-js/blob/master/src/util.ts
// TODO - I hate all of this. Remove this. This is bad. Kill it
class Util {
	public static inRange(val: number, range: number[]): boolean {
		return range.includes(val);
	}

	public static clamp(val: number, min: number, max?: number): number {
		if (max === undefined) {
			max = min;
			min = 0;
		}

		return Math.min(Math.max(val, min), max);
	}

	public static range(start: number, end?: number): number[] {
		if (end === undefined) {
			end = start;
			start = 0;
		}
		return Array.from({ length: end - start }, (_, i) => i + start);
	}
}

/**
 * Implements decoding/encoding of gen2 (Wii U, 3DS, Miitomo) Mii data
 */
export default class MiiGen2 {
	// * Fields are not grouped/stored here in the
	// * same order they are found in the Mii data
	public version = 0; // * This will be either 0 or 3. If a Mii is created using the Wii U GamePad camera, version is 0. Otherwise 3
	public flags = {
		allowCopying: false,
		hasProfanity: false,
		isFavorite: false,
		alwaysSet: false,
		isTemporary: false,
		isDSi: false,
		isSpecial: false,
		disableSharing: false
	};
	public region = {
		lock: 0,
		characterSet: 0
	};
	public position = {
		pageIndex: 0,
		slotIndex: 0
	};
	public unknown = 0;
	public deviceOrigin = 0;
	public systemID = Buffer.alloc(0);
	public creationDateSeconds = 0; // TODO - Should this be a Date object instead?
	public creatorMAC = Buffer.alloc(0);
	public birthdate = {
		month: 0,
		day: 0
	};
	public name = '';
	public authorName = '';
	public appearance = {
		sex: 'male',
		favoriteColor: 0,
		width: 0,
		height: 0,
		face: {
			type: 0,
			color: 0,
			wrinklesType: 0,
			makeupType: 0
		},
		hair: {
			type: 0,
			color: 0,
			flipped: false // TODO - Should this be moved to `flags`?
		},
		eyes: {
			type: 0,
			color: 0,
			scale: 0,
			height: 0,
			rotation: 0,
			x: 0, // TODO - Should this be renamed, or is it clear? 3dbrew documents as "eye x spacing"
			y: 0
		},
		eyebrows: {
			type: 0,
			color: 0,
			scale: 0,
			height: 0,
			rotation: 0,
			x: 0, // TODO - Should this be renamed, or is it clear? 3dbrew documents as "eyebrow x spacing"
			y: 0
		},
		nose: {
			type: 0,
			scale: 0,
			y: 0
		},
		mouth: {
			type: 0,
			color: 0,
			scale: 0,
			height: 0, // TODO - Should this be renamed, or is it clear? 3dbrew documents as "mouth yscale"
			y: 0
		},
		facialHair: {
			color: 0,
			mustache: {
				type: 0,
				scale: 0,
				y: 0
			},
			beard: {
				type: 0
			}
		},
		glasses: {
			type: 0,
			color: 0,
			scale: 0,
			y: 0
		},
		mole: {
			enabled: false, // TODO - Should this be moved to `flags`?
			scale: 0,
			x: 0,
			y: 0
		}
	};

	/**
	 * Parses the MiiGen2 from the provided `buffer`
	 *
	 * @param buffer - MiiGen2 data buffer
	 */
	public parseFromBuffer(buffer: Buffer): void {
		this.parse(buffer);
	}

	/**
	 * Parses the MiiGen2 from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded MiiGen2 data
	 */
	public parseFromString(base64: string): void {
		this.parseFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Creates a new instance of `MiiGen2` and
	 * parses the MiiGen2 from the provided `buffer`
	 *
	 * @param buffer - MiiGen2 data buffer
	 */
	public static fromBuffer(buffer: Buffer): MiiGen2 {
		const mii = new MiiGen2();
		mii.parseFromBuffer(buffer);

		return mii;
	}

	/**
	 * Creates a new instance of `MiiGen2` and
	 * parses the MiiGen2 from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded MiiGen2 data
	 */
	public static fromString(base64: string): MiiGen2 {
		const mii = new MiiGen2();
		mii.parseFromString(base64);

		return mii;
	}

	private parse(data: string | Buffer) {
		const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;

		// TODO - Support data without a checksum?
		if (buffer.length !== 0x60) {
			throw new Error('Invalid MiiGen2 data size');
		}

		this.version = buffer.readUInt8(0x00);

		const field0x01 = new BitReader(buffer.subarray(0x01, 0x02));
		this.flags.allowCopying = field0x01.readBits(1) !== 0;
		this.flags.hasProfanity = field0x01.readBits(1) !== 0;
		this.region.lock = field0x01.readBits(2);
		this.region.characterSet = field0x01.readBits(2);

		const field0x02 = new BitReader(buffer.subarray(0x02, 0x03));
		this.position.pageIndex = field0x02.readBits(4);
		this.position.slotIndex = field0x02.readBits(4);

		const field0x03 =  new BitReader(buffer.subarray(0x03, 0x04));
		this.unknown = field0x03.readBits(4);
		this.deviceOrigin = field0x03.readBits(3);

		this.systemID = buffer.subarray(0x04, 0x0C);

		// * Field is a big-endian uint32.
		// * Read data in reverse order to documentation to account for endianness
		const field0x0C = new BitReader(buffer.subarray(0x0C, 0x10), true);
		this.flags.isSpecial = field0x0C.readBits(1) === 0;
		this.flags.isDSi = field0x0C.readBits(1) === 1;
		this.flags.isTemporary = field0x0C.readBits(1) === 1;
		this.flags.alwaysSet = field0x0C.readBits(1) === 1;
		this.creationDateSeconds = field0x0C.readBits(28) * 2;

		this.creatorMAC = buffer.subarray(0x10, 0x16);

		// TODO - Assert that the padding at 0x16 is all 0?

		const field0x18 = new BitReader(buffer.subarray(0x18, 0x1A));
		this.appearance.sex = field0x18.readBits(1) === 0 ? 'male' : 'female';
		this.birthdate.month = field0x18.readBits(4);
		this.birthdate.day = field0x18.readBits(5);
		this.appearance.favoriteColor = field0x18.readBits(4);
		this.flags.isFavorite = field0x18.readBits(1) === 1;

		this.name = buffer.subarray(0x1A, 0x2E).toString('utf16le').replace(/\0.*$/, ''); // TODO - This is kinda ugly?

		this.appearance.width = buffer.readUInt8(0x2E);
		this.appearance.height = buffer.readUInt8(0x2F);

		const field0x30 = new BitReader(buffer.subarray(0x30, 0x31));
		this.flags.disableSharing = field0x30.readBits(1) !== 0;
		this.appearance.face.type = field0x30.readBits(4);
		this.appearance.face.color = field0x30.readBits(3);

		const field0x31 = new BitReader(buffer.subarray(0x31, 0x32));
		this.appearance.face.wrinklesType = field0x31.readBits(4);
		this.appearance.face.makeupType = field0x31.readBits(4);

		this.appearance.hair.type = buffer.readUInt8(0x32);

		const field0x33 = new BitReader(buffer.subarray(0x33, 0x34));
		this.appearance.hair.color = field0x33.readBits(3);
		this.appearance.hair.flipped = field0x33.readBits(1) !== 0;

		const field0x34 = new BitReader(buffer.subarray(0x34, 0x38));
		this.appearance.eyes.type = field0x34.readBits(6);
		this.appearance.eyes.color = field0x34.readBits(3);
		this.appearance.eyes.scale = field0x34.readBits(4);
		this.appearance.eyes.height = field0x34.readBits(3);
		this.appearance.eyes.rotation = field0x34.readBits(5);
		this.appearance.eyes.x = field0x34.readBits(4);
		this.appearance.eyes.y = field0x34.readBits(5);

		const field0x38 = new BitReader(buffer.subarray(0x38, 0x3C));
		this.appearance.eyebrows.type = field0x38.readBits(5);
		this.appearance.eyebrows.color = field0x38.readBits(3);
		this.appearance.eyebrows.scale = field0x38.readBits(4);
		this.appearance.eyebrows.height = field0x38.readBits(3);
		field0x38.readBits(1); // * Unused
		this.appearance.eyebrows.rotation = field0x38.readBits(4);
		field0x38.readBits(1); // * Unused
		this.appearance.eyebrows.x = field0x38.readBits(4);
		this.appearance.eyebrows.y = field0x38.readBits(5);

		const field0x3C = new BitReader(buffer.subarray(0x3C, 0x3E));
		this.appearance.nose.type = field0x3C.readBits(5);
		this.appearance.nose.scale = field0x3C.readBits(4);
		this.appearance.nose.y = field0x3C.readBits(5);

		const field0x3E = new BitReader(buffer.subarray(0x3E, 0x40));
		this.appearance.mouth.type = field0x3E.readBits(6);
		this.appearance.mouth.color = field0x3E.readBits(3);
		this.appearance.mouth.scale = field0x3E.readBits(4);
		this.appearance.mouth.height = field0x3E.readBits(3);

		const field0x40 = new BitReader(buffer.subarray(0x40, 0x42));
		this.appearance.mouth.y = field0x40.readBits(5);
		this.appearance.facialHair.mustache.type = field0x40.readBits(3);

		const field0x42 = new BitReader(buffer.subarray(0x42, 0x44));
		this.appearance.facialHair.beard.type = field0x42.readBits(3);
		this.appearance.facialHair.color = field0x42.readBits(3);
		this.appearance.facialHair.mustache.scale = field0x42.readBits(4);
		this.appearance.facialHair.mustache.y = field0x42.readBits(5);

		const field0x44 = new BitReader(buffer.subarray(0x44, 0x46));
		this.appearance.glasses.type = field0x44.readBits(4);
		this.appearance.glasses.color = field0x44.readBits(3);
		this.appearance.glasses.scale = field0x44.readBits(4);
		this.appearance.glasses.y = field0x44.readBits(5);

		const field0x46 = new BitReader(buffer.subarray(0x46, 0x48));
		this.appearance.mole.enabled = field0x46.readBits(1) === 1;
		this.appearance.mole.scale = field0x46.readBits(4);
		this.appearance.mole.x = field0x46.readBits(5);
		this.appearance.mole.y = field0x46.readBits(5);

		this.authorName = buffer.subarray(0x48, 0x5C).toString('utf16le').replace(/\0.*$/, ''); // TODO - This is kinda ugly?

		// TODO - Assert that the padding at 0x5C is all 0?

		const checksum = buffer.readUint16BE(0x5E);

		if (checksum !== this.calculateCRC(buffer.subarray(0, 0x5E))) {
			throw new Error('Invalid MiiGen2 checksum');
		}

		this.validateFields(); // * Ensure data is good
	}

	/**
	 * Encodes the MiiGen2 data into a Buffer
	 *
	 * @returns encoded MiiGen2
	 */
	public bytes(): Buffer {
		this.validateFields(); // * Don't encode bad data

		// * 0x5C bytes for data + 2 bytes of padding
		const bytes = Buffer.alloc(0x5E);

		bytes.writeUInt8(this.version, 0x00);

		const field0x01 = new BitWriter(bytes.subarray(0x01, 0x02));
		field0x01.writeBits(1, this.flags.allowCopying ? 1 : 0);
		field0x01.writeBits(1, this.flags.hasProfanity ? 1 : 0);
		field0x01.writeBits(2, this.region.lock);
		field0x01.writeBits(2, this.region.characterSet);

		const field0x02 = new BitWriter(bytes.subarray(0x02, 0x03));
		field0x02.writeBits(4, this.position.pageIndex);
		field0x02.writeBits(4, this.position.slotIndex);

		const field0x03 = new BitWriter(bytes.subarray(0x03, 0x04));
		field0x03.writeBits(4, this.unknown);
		field0x03.writeBits(3, this.deviceOrigin);

		this.systemID.copy(bytes, 0x04);

		// * Field is a big-endian uint32.
		// * Write data in reverse order to documentation to account for endianness
		const field0x0C = new BitWriter(bytes.subarray(0x0C, 0x10), true);
		field0x0C.writeBits(1, this.flags.isSpecial ? 0 : 1); // * Bit is NOT set if special
		field0x0C.writeBits(1, this.flags.isDSi ? 1 : 0);
		field0x0C.writeBits(1, this.flags.isTemporary ? 1 : 0);
		field0x0C.writeBits(1, this.flags.alwaysSet ? 1 : 0);
		field0x0C.writeBits(28, Math.floor(this.creationDateSeconds / 2));

		this.creatorMAC.copy(bytes, 0x10);

		const field0x18 = new BitWriter(bytes.subarray(0x18, 0x1A));
		field0x18.writeBits(1, this.appearance.sex === 'female' ? 1 : 0);
		field0x18.writeBits(4, this.birthdate.month);
		field0x18.writeBits(5, this.birthdate.day);
		field0x18.writeBits(4, this.appearance.favoriteColor);
		field0x18.writeBits(1, this.flags.isFavorite ? 1 : 0);

		Buffer.from(this.name, 'utf16le').copy(bytes, 0x1A); // TODO - This is kinda ugly?

		bytes.writeUInt8(this.appearance.width, 0x2E);
		bytes.writeUInt8(this.appearance.height, 0x2F);

		const field0x30 = new BitWriter(bytes.subarray(0x30, 0x31));
		field0x30.writeBits(1, this.flags.disableSharing ? 1 : 0);
		field0x30.writeBits(4, this.appearance.face.type);
		field0x30.writeBits(3, this.appearance.face.color);

		const field0x31 = new BitWriter(bytes.subarray(0x31, 0x32));
		field0x31.writeBits(4, this.appearance.face.wrinklesType);
		field0x31.writeBits(4, this.appearance.face.makeupType);

		bytes.writeUInt8(this.appearance.hair.type, 0x32);

		const field0x33 = new BitWriter(bytes.subarray(0x33, 0x34));
		field0x33.writeBits(3, this.appearance.hair.color);
		field0x33.writeBits(1, this.appearance.hair.flipped ? 1 : 0);

		const field0x34 = new BitWriter(bytes.subarray(0x34, 0x38));
		field0x34.writeBits(6, this.appearance.eyes.type);
		field0x34.writeBits(3, this.appearance.eyes.color);
		field0x34.writeBits(4, this.appearance.eyes.scale);
		field0x34.writeBits(3, this.appearance.eyes.height);
		field0x34.writeBits(5, this.appearance.eyes.rotation);
		field0x34.writeBits(4, this.appearance.eyes.x);
		field0x34.writeBits(5, this.appearance.eyes.y);

		const field0x38 = new BitWriter(bytes.subarray(0x38, 0x3C));
		field0x38.writeBits(5, this.appearance.eyebrows.type);
		field0x38.writeBits(3, this.appearance.eyebrows.color);
		field0x38.writeBits(4, this.appearance.eyebrows.scale);
		field0x38.writeBits(3, this.appearance.eyebrows.height);
		field0x38.writeBits(1, 0); // * Unused
		field0x38.writeBits(4, this.appearance.eyebrows.rotation);
		field0x38.writeBits(1, 0); // * Unused
		field0x38.writeBits(4, this.appearance.eyebrows.x);
		field0x38.writeBits(5, this.appearance.eyebrows.y);

		const field0x3C = new BitWriter(bytes.subarray(0x3C, 0x3E));
		field0x3C.writeBits(5, this.appearance.nose.type);
		field0x3C.writeBits(4, this.appearance.nose.scale);
		field0x3C.writeBits(5, this.appearance.nose.y);

		const field0x3E = new BitWriter(bytes.subarray(0x3E, 0x40));
		field0x3E.writeBits(6, this.appearance.mouth.type);
		field0x3E.writeBits(3, this.appearance.mouth.color);
		field0x3E.writeBits(4, this.appearance.mouth.scale);
		field0x3E.writeBits(3, this.appearance.mouth.height);

		const field0x40 = new BitWriter(bytes.subarray(0x40, 0x42));
		field0x40.writeBits(5, this.appearance.mouth.y);
		field0x40.writeBits(3, this.appearance.facialHair.mustache.type);

		const field0x42 = new BitWriter(bytes.subarray(0x42, 0x44));
		field0x42.writeBits(3, this.appearance.facialHair.beard.type);
		field0x42.writeBits(3, this.appearance.facialHair.color);
		field0x42.writeBits(4, this.appearance.facialHair.mustache.scale);
		field0x42.writeBits(5, this.appearance.facialHair.mustache.y);

		const field0x44 = new BitWriter(bytes.subarray(0x44, 0x46));
		field0x44.writeBits(4, this.appearance.glasses.type);
		field0x44.writeBits(3, this.appearance.glasses.color);
		field0x44.writeBits(4, this.appearance.glasses.scale);
		field0x44.writeBits(5, this.appearance.glasses.y);

		const field0x46 = new BitWriter(bytes.subarray(0x46, 0x48));
		field0x46.writeBits(1, this.appearance.mole.enabled ? 1 : 0);
		field0x46.writeBits(4, this.appearance.mole.scale);
		field0x46.writeBits(5, this.appearance.mole.x);
		field0x46.writeBits(5, this.appearance.mole.y);

		Buffer.from(this.authorName, 'utf16le').copy(bytes, 0x48); // TODO - This is kinda ugly?

		const checksum = Buffer.alloc(2);
		checksum.writeUInt16BE(this.calculateCRC(bytes));

		return Buffer.concat([
			bytes,
			checksum
		]);
	}

	private calculateCRC(data: Buffer): number {
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

		return crc & 0xffff;
	}

	private validateFields(): void {
		assert.ok(this.version === 0 || this.version === 3, `Invalid MiiGen2 version. Got ${this.version}, expected 0 or 3`);
		assert.equal(typeof this.flags.allowCopying, 'boolean', `Invalid MiiGen2 allow copying. Got ${this.flags.allowCopying}, expected true or false`);
		assert.equal(typeof this.flags.hasProfanity, 'boolean', `Invalid MiiGen2 profanity flag. Got ${this.flags.hasProfanity}, expected true or false`);
		assert.ok(Util.inRange(this.region.lock, Util.range(4)), `Invalid MiiGen2 region lock. Got ${this.region.lock}, expected 0-3`);
		assert.ok(Util.inRange(this.region.characterSet, Util.range(4)), `Invalid MiiGen2 region lock. Got ${this.region.characterSet}, expected 0-3`);
		assert.ok(Util.inRange(this.position.pageIndex, Util.range(10)), `Invalid MiiGen2 page index. Got ${this.position.pageIndex}, expected 0-9`);
		assert.ok(Util.inRange(this.position.slotIndex, Util.range(10)), `Invalid MiiGen2 slot index. Got ${this.position.slotIndex}, expected 0-9`);
		assert.equal(this.unknown, 0, `Invalid MiiGen2 unknown. Got ${this.unknown}, expected 0`);
		assert.ok(Util.inRange(this.deviceOrigin, Util.range(1, 5)), `Invalid MiiGen2 device origin. Got ${this.deviceOrigin}, expected 1-4`);
		assert.equal(this.systemID.length, 8, `Invalid MiiGen2 system ID size. Got ${this.systemID.length}, system IDs must be 8 bytes long`);
		assert.equal(typeof this.flags.isSpecial, 'boolean', `Invalid special Mii flag. Got ${this.flags.isSpecial}, expected true or false`);
		assert.equal(typeof this.flags.isDSi, 'boolean', `Invalid DSi Mii flag. Got ${this.flags.isDSi}, expected true or false`);
		assert.equal(typeof this.flags.isTemporary, 'boolean', `Invalid temporary Mii flag. Got ${this.flags.isTemporary}, expected true or false`);
		assert.equal(typeof this.flags.alwaysSet, 'boolean', `Invalid MiiGen2 always set flag. Got ${this.flags.alwaysSet}, expected true or false`);
		assert.ok(this.creationDateSeconds/2 < 268435456, `Invalid MiiGen2 creation date. Got ${this.creationDateSeconds}, max value for 28 bit integer is 268,435,456`);
		assert.equal(this.creatorMAC.length, 6, `Invalid MiiGen2 creator MAC address size. Got ${this.creatorMAC.length}, console MAC addresses must be 6 bytes long`);
		assert.ok(this.appearance.sex === 'male' || this.appearance.sex === 'female', `Invalid MiiGen2 sex. Got ${this.appearance.sex}, expected 0 or 1`);
		assert.ok(Util.inRange(this.birthdate.month, Util.range(13)), `Invalid MiiGen2 birth month. Got ${this.birthdate.month}, expected 0-12`);
		assert.ok(Util.inRange(this.birthdate.day, Util.range(32)), `Invalid MiiGen2 birth day. Got ${this.birthdate.day}, expected 0-31`);
		assert.ok(Util.inRange(this.appearance.favoriteColor, Util.range(12)), `Invalid MiiGen2 favorite color. Got ${this.appearance.favoriteColor}, expected 0-11`);
		assert.equal(typeof this.flags.isFavorite, 'boolean', `Invalid favorite Mii flag. Got ${this.flags.isFavorite}, expected true or false`);
		assert.ok(Buffer.from(this.name, 'utf16le').length <= 0x14, `Invalid MiiGen2 name. Got ${this.name}, name may only be up to 10 characters`);
		assert.ok(Util.inRange(this.appearance.width, Util.range(128)), `Invalid MiiGen2 height. Got ${this.appearance.width}, expected 0-127`);
		assert.ok(Util.inRange(this.appearance.height, Util.range(128)), `Invalid MiiGen2 build. Got ${this.appearance.height}, expected 0-127`);
		assert.equal(typeof this.flags.disableSharing, 'boolean', `Invalid disable sharing Mii flag. Got ${this.flags.disableSharing}, expected true or false`);
		assert.ok(Util.inRange(this.appearance.face.type, Util.range(12)), `Invalid MiiGen2 face type. Got ${this.appearance.face.type}, expected 0-11`);
		assert.ok(Util.inRange(this.appearance.face.color, Util.range(7)), `Invalid MiiGen2 skin color. Got ${this.appearance.face.color}, expected 0-6`);
		assert.ok(Util.inRange(this.appearance.face.wrinklesType, Util.range(12)), `Invalid MiiGen2 wrinkles type. Got ${this.appearance.face.wrinklesType}, expected 0-11`);
		assert.ok(Util.inRange(this.appearance.face.makeupType, Util.range(12)), `Invalid MiiGen2 makeup type. Got ${this.appearance.face.makeupType}, expected 0-11`);
		assert.ok(Util.inRange(this.appearance.hair.type, Util.range(132)), `Invalid MiiGen2 hair type. Got ${this.appearance.hair.type}, expected 0-131`);
		assert.ok(Util.inRange(this.appearance.hair.color, Util.range(8)), `Invalid MiiGen2 hair color. Got ${this.appearance.hair.color}, expected 0-7`);
		assert.equal(typeof this.appearance.hair.flipped, 'boolean', `Invalid flip hair flag. Got ${this.appearance.hair.flipped}, expected true or false`);
		assert.ok(Util.inRange(this.appearance.eyes.type, Util.range(60)), `Invalid MiiGen2 eye type. Got ${this.appearance.eyes.type}, expected 0-59`);
		assert.ok(Util.inRange(this.appearance.eyes.color, Util.range(6)), `Invalid MiiGen2 eye color. Got ${this.appearance.eyes.color}, expected 0-5`);
		assert.ok(Util.inRange(this.appearance.eyes.scale, Util.range(8)), `Invalid MiiGen2 eye scale. Got ${this.appearance.eyes.scale}, expected 0-7`);
		assert.ok(Util.inRange(this.appearance.eyes.height, Util.range(7)), `Invalid MiiGen2 eye vertical stretch. Got ${this.appearance.eyes.height}, expected 0-6`);
		assert.ok(Util.inRange(this.appearance.eyes.rotation, Util.range(8)), `Invalid MiiGen2 eye rotation. Got ${this.appearance.eyes.rotation}, expected 0-7`);
		assert.ok(Util.inRange(this.appearance.eyes.x, Util.range(13)), `Invalid MiiGen2 eye spacing. Got ${this.appearance.eyes.x}, expected 0-12`);
		assert.ok(Util.inRange(this.appearance.eyes.y, Util.range(19)), `Invalid MiiGen2 eye Y position. Got ${this.appearance.eyes.y}, expected 0-18`);
		assert.ok(Util.inRange(this.appearance.eyebrows.type, Util.range(25)), `Invalid MiiGen2 eyebrow type. Got ${this.appearance.eyebrows.type}, expected 0-24`);
		assert.ok(Util.inRange(this.appearance.eyebrows.color, Util.range(8)), `Invalid MiiGen2 eyebrow color. Got ${this.appearance.eyebrows.color}, expected 0-7`);
		assert.ok(Util.inRange(this.appearance.eyebrows.scale, Util.range(9)), `Invalid MiiGen2 eyebrow scale. Got ${this.appearance.eyebrows.scale}, expected 0-8`);
		assert.ok(Util.inRange(this.appearance.eyebrows.height, Util.range(7)), `Invalid MiiGen2 eyebrow vertical stretch. Got ${this.appearance.eyebrows.height}, expected 0-6`);
		assert.ok(Util.inRange(this.appearance.eyebrows.rotation, Util.range(12)), `Invalid MiiGen2 eyebrow rotation. Got ${this.appearance.eyebrows.rotation}, expected 0-11`);
		assert.ok(Util.inRange(this.appearance.eyebrows.x, Util.range(13)), `Invalid MiiGen2 eyebrow spacing. Got ${this.appearance.eyebrows.x}, expected 0-12`);
		assert.ok(Util.inRange(this.appearance.eyebrows.y, Util.range(3, 19)), `Invalid MiiGen2 eyebrow Y position. Got ${this.appearance.eyebrows.y}, expected 3-18`);
		assert.ok(Util.inRange(this.appearance.nose.type, Util.range(18)), `Invalid MiiGen2 nose type. Got ${this.appearance.nose.type}, expected 0-17`);
		assert.ok(Util.inRange(this.appearance.nose.scale, Util.range(9)), `Invalid MiiGen2 nose scale. Got ${this.appearance.nose.scale}, expected 0-8`);
		assert.ok(Util.inRange(this.appearance.nose.y, Util.range(19)), `Invalid MiiGen2 nose Y position. Got ${this.appearance.nose.y}, expected 0-18`);
		assert.ok(Util.inRange(this.appearance.mouth.type, Util.range(36)), `Invalid MiiGen2 mouth type. Got ${this.appearance.mouth.type}, expected 0-35`);
		assert.ok(Util.inRange(this.appearance.mouth.color, Util.range(5)), `Invalid MiiGen2 mouth color. Got ${this.appearance.mouth.color}, expected 0-4`);
		assert.ok(Util.inRange(this.appearance.mouth.scale, Util.range(9)), `Invalid MiiGen2 mouth scale. Got ${this.appearance.mouth.scale}, expected 0-8`);
		assert.ok(Util.inRange(this.appearance.mouth.height, Util.range(7)), `Invalid MiiGen2 mouth stretch. Got ${this.appearance.mouth.height}, expected 0-6`);
		assert.ok(Util.inRange(this.appearance.mouth.y, Util.range(19)), `Invalid MiiGen2 mouth Y position. Got ${this.appearance.mouth.y}, expected 0-18`);
		assert.ok(Util.inRange(this.appearance.facialHair.mustache.type, Util.range(6)), `Invalid MiiGen2 mustache type. Got ${this.appearance.facialHair.mustache.type}, expected 0-5`);
		assert.ok(Util.inRange(this.appearance.facialHair.beard.type, Util.range(6)), `Invalid MiiGen2 beard type. Got ${this.appearance.facialHair.beard.type}, expected 0-5`);
		assert.ok(Util.inRange(this.appearance.facialHair.color, Util.range(8)), `Invalid MiiGen2 beard type. Got ${this.appearance.facialHair.color}, expected 0-7`);
		assert.ok(Util.inRange(this.appearance.facialHair.mustache.scale, Util.range(9)), `Invalid MiiGen2 mustache scale. Got ${this.appearance.facialHair.mustache.scale}, expected 0-8`);
		assert.ok(Util.inRange(this.appearance.facialHair.mustache.y, Util.range(17)), `Invalid MiiGen2 mustache Y position. Got ${this.appearance.facialHair.mustache.y}, expected 0-16`);
		assert.ok(Util.inRange(this.appearance.glasses.type, Util.range(9)), `Invalid MiiGen2 glassess type. Got ${this.appearance.glasses.type}, expected 0-8`);
		assert.ok(Util.inRange(this.appearance.glasses.color, Util.range(6)), `Invalid MiiGen2 glassess type. Got ${this.appearance.glasses.color}, expected 0-5`);
		assert.ok(Util.inRange(this.appearance.glasses.scale, Util.range(8)), `Invalid MiiGen2 glassess type. Got ${this.appearance.glasses.scale}, expected 0-7`);
		assert.ok(Util.inRange(this.appearance.glasses.y, Util.range(21)), `Invalid MiiGen2 glassess Y position. Got ${this.appearance.glasses.y}, expected 0-20`);
		assert.equal(typeof this.appearance.mole.enabled, 'boolean', `Invalid mole enabled flag. Got ${this.appearance.mole.enabled}, expected true or false`);
		assert.ok(Util.inRange(this.appearance.mole.scale, Util.range(9)), `Invalid MiiGen2 mole scale. Got ${this.appearance.mole.scale}, expected 0-8`);
		assert.ok(Util.inRange(this.appearance.mole.x, Util.range(17)), `Invalid MiiGen2 mole X position. Got ${this.appearance.mole.x}, expected 0-16`);
		assert.ok(Util.inRange(this.appearance.mole.y, Util.range(31)), `Invalid MiiGen2 mole Y position. Got ${this.appearance.mole.y}, expected 0-30`);
		assert.ok(Buffer.from(this.authorName, 'utf16le').length <= 0x14, `Invalid MiiGen2 author name. Got ${this.authorName}, name may only be up to 10 characters`);

		// TODO - Sanity checks. Ensure values make sense together, and validate flag combinations
	}
}