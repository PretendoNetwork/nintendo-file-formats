import { BitStream } from 'bit-buffer';

// * This exists solely because I really like the API of binary-parser, however it has 2 major issues:
// *
// * 1. It does not natively support encoding. There is a PR for this https://github.com/keichi/binary-parser/pull/243
// *    however it has had no activity in 2 years and shows no signs of being merged.
// *
// * 2. It, and some other binary parsing libraries I tried like struct-fu, seem to have weird issues where they can't
// *    handle some Mii data? I genuinely have no idea why. I found that bit-buffer can handle it fine though, so I decided
// *    to just build a binary-parser style API around it. See https://gist.github.com/jonbarrow/aa4f448cc2a3fa4f1f49721ad3c93f1c
// *    for an example of this issue.
// *
// * Plus this adds in many helpful additions like bit skipping, more type safety, a Zod-like interface, etc.

// TODO - Remove all the "unknown" usage? Seems kinda smelly
// TODO - Support nested structures? We don't need it right now but might be nice to have

type FieldType =
	| { type: 'set_endianness'; endianness: 'big' | 'little'; bits: 0 }
	| { type: 'skip'; bits: number }
	| { type: 'bits'; name: string; bits: number }
	| { type: 'boolean_bit'; name: string; bits: 1 }
	| { type: 'uint'; name: string; bits: 8 }
	| { type: 'uint'; name: string; endianness: 'current' | 'big' | 'little'; bits: 16 }
	| { type: 'uint'; name: string; endianness: 'current' | 'big' | 'little'; bits: 32 }
	| { type: 'buffer'; name: string; length: number; bits: number }
	| { type: 'string'; name: string; length: number; encoding: BufferEncoding; bits: number };

/**
 * Custom structure parser with an API aimed at matching `binary-parser`, with additions. Uses `bit-buffer` under the hood
 */
export default class BinaryParser<T extends Record<string, any>> { // eslint-disable-line @typescript-eslint/no-explicit-any
	private structure: FieldType[] = [];

	/**
	 * Zod-like `z.infer` method, Do not call at runtime. Use `ReturnType<typeof BinaryParser.infer<typeof parser>>`
	 */
	static infer<TParser extends BinaryParser<any>>(_parser: TParser): TParser extends BinaryParser<infer U> ? U : never { // eslint-disable-line @typescript-eslint/no-explicit-any
		throw new Error('This method is only for type inference and should never be called at runtime.');
	}

	/**
	 * Sets the endianness for all values moving forward. Parser is little-endian by default
	 *
	 * @param endianness - The new endianness
	 * @returns The current `BinaryParser` instance
	 */
	public endianness(endianness: 'big' | 'little'): this {
		this.structure.push({
			type: 'set_endianness',
			endianness: endianness,
			bits: 0
		});

		return this;
	}

	/**
	 * Alias of `bitN`
	 *
	 * @param name - The name of the decoded field
	 * @param bits - The number of bits to read
	 * @returns The current `BinaryParser` instance
	 */
	public bits<K extends string>(name: K, bits: number): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, bits);
	}

	/**
	 * Reads `bits` number of bits
	 *
	 * @param name - The name of the decoded field
	 * @param bits - The number of bits to read
	 * @returns The current `BinaryParser` instance
	 */
	public bitN<K extends string>(name: K, bits: number): BinaryParser<T & { [P in K]: number }> {
		this.structure.push({
			type: 'bits',
			name: name,
			bits: bits
		});

		return this;
	}

	/**
	 * Reads a single bit, interpreted as a boolean
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public booleanBit<K extends string>(name: K): BinaryParser<T & { [P in K]: boolean }> {
		this.structure.push({
			type: 'boolean_bit',
			name: name,
			bits: 1
		});

		return this;
	}

	/**
	 * Alias of `bit1`
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bit1(name);
	}

	/**
	 * Reads a single bit
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit1<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 1);
	}

	/**
	 * Reads 2 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit2<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 2);
	}

	/**
	 * Reads 3 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit3<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 3);
	}

	/**
	 * Reads 4 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit4<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 4);
	}

	/**
	 * Reads 5 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit5<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 5);
	}

	/**
	 * Reads 6 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit6<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 6);
	}

	/**
	 * Reads 7 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit7<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 7);
	}

	/**
	 * Reads 8 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit8<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 8);
	}

	/**
	 * Reads 9 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit9<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 9);
	}

	/**
	 * Reads 10 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit10<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 10);
	}

	/**
	 * Reads 11 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit11<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 11);
	}

	/**
	 * Reads 12 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit12<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 12);
	}

	/**
	 * Reads 13 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit13<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 13);
	}

	/**
	 * Reads 14 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit14<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 14);
	}

	/**
	 * Reads 15 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit15<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 15);
	}

	/**
	 * Reads 16 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit16<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 16);
	}

	/**
	 * Reads 17 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit17<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 17);
	}

	/**
	 * Reads 18 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit18<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 18);
	}

	/**
	 * Reads 19 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit19<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 19);
	}

	/**
	 * Reads 20 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit20<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 20);
	}

	/**
	 * Reads 21 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit21<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 21);
	}

	/**
	 * Reads 22 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit22<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 22);
	}

	/**
	 * Reads 23 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit23<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 23);
	}

	/**
	 * Reads 24 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit24<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 24);
	}

	/**
	 * Reads 25 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit25<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 25);
	}

	/**
	 * Reads 26 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit26<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 26);
	}

	/**
	 * Reads 27 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit27<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 27);
	}

	/**
	 * Reads 28 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit28<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 28);
	}

	/**
	 * Reads 29 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit29<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 29);
	}

	/**
	 * Reads 30 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit30<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 30);
	}

	/**
	 * Reads 31 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit31<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 31);
	}

	/**
	 * Reads 32 bits
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public bit32<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		return this.bitN(name, 32);
	}

	/**
	 * Reads an unsigned 8-bit integer
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public uint8<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		this.structure.push({
			type: 'uint',
			name: name,
			bits: 8
		});

		return this;
	}

	/**
	 * Reads an unsigned 16-bit integer using the currently set endianness
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public uint16<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		this.structure.push({
			type: 'uint',
			name: name,
			endianness: 'current',
			bits: 16
		});

		return this;
	}

	/**
	 * Reads an unsigned 16-bit integer in little-endian mode, regardless of the currently set endianness
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public uint16le<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		this.structure.push({
			type: 'uint',
			name: name,
			endianness: 'little',
			bits: 16
		});

		return this;
	}

	/**
	 * Reads an unsigned 16-bit integer in big-endian mode, regardless of the currently set endianness
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public uint16be<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		this.structure.push({
			type: 'uint',
			name: name,
			endianness: 'big',
			bits: 16
		});

		return this;
	}

	/**
	 * Reads an unsigned 32-bit integer using the currently set endianness
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public uint32<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		this.structure.push({
			type: 'uint',
			name: name,
			endianness: 'current',
			bits: 32
		});

		return this;
	}

	/**
	 * Reads an unsigned 32-bit integer in little-endian mode, regardless of the currently set endianness
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public uint32le<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		this.structure.push({
			type: 'uint',
			name: name,
			endianness: 'little',
			bits: 32
		});

		return this;
	}

	/**
	 * Reads an unsigned 32-bit integer in big-endian mode, regardless of the currently set endianness
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public uint32be<K extends string>(name: K): BinaryParser<T & { [P in K]: number }> {
		this.structure.push({
			type: 'uint',
			name: name,
			endianness: 'big',
			bits: 32
		});

		return this;
	}

	/**
	 * Skips `length` bytes. When encoding, skipped bytes are set to null
	 *
	 * @param length - The number of bytes to skip
	 * @returns The current `BinaryParser` instance
	 */
	public skip(length: number): this {
		return this.skipBits(length * 8);
	}

	/**
	 * Skips `length` bits. When encoding, skipped bits are set to 0
	 *
	 * @param length - The number of bits to skip
	 * @returns The current `BinaryParser` instance
	 */
	public skipBits(length: number): this {
		this.structure.push({
			type: 'skip',
			bits: length
		});

		return this;
	}

	/**
	 * Reads a `Buffer` of data of size `options.length`
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public buffer<K extends string>(name: K, options: { length: number; }): BinaryParser<T & { [P in K]: Buffer }> {
		this.structure.push({
			type: 'buffer',
			name: name,
			length: options.length,
			bits: options.length * 8
		});

		return this;
	}

	/**
	 * Reads a string of data of size `options.length` in `options.encoding` encoding
	 *
	 * @param name - The name of the decoded field
	 * @returns The current `BinaryParser` instance
	 */
	public string<K extends string>(name: K, options: { length: number; encoding: BufferEncoding; }): BinaryParser<T & { [P in K]: string }> {
		this.structure.push({
			type: 'string',
			name: name,
			length: options.length,
			encoding: options.encoding,
			bits: options.length * 8
		});

		return this;
	}

	/**
	 * Uses the current structure to parse `data`. Will throw any errors that occur
	 *
	 * @param data - Raw binary data to parse with the current structure
	 * @returns Object of parsed data
	 */
	public parse(data: Buffer): T {
		const stream = new BitStream(data, data.byteOffset, data.byteLength);
		const result: Record<string, unknown> = {};

		for (const data of this.structure) {
			if (data.type === 'set_endianness') {
				stream.bigEndian = data.endianness === 'big' ? true : false;
			}

			if (data.type === 'skip') {
				stream.index += data.bits;
				continue;
			}

			if (data.type === 'bits') {
				result[data.name] = stream.readBits(data.bits);
			}

			if (data.type === 'boolean_bit') {
				result[data.name] = !!stream.readBits(1);
			}

			if (data.type === 'uint') {
				const currentEndianness = stream.bigEndian;

				if (data.bits !== 8 && data.endianness !== 'current') {
					stream.bigEndian = data.endianness === 'big' ? true : false;
				}

				result[data.name] = data.bits === 8 ? stream.readUint8() : data.bits === 16 ? stream.readUint16() : stream.readUint32();

				stream.bigEndian = currentEndianness;
			}

			if (data.type === 'buffer') {
				result[data.name] = Buffer.from(stream.readArrayBuffer(data.length));
			}

			if (data.type === 'string') {
				result[data.name] = Buffer.from(stream.readArrayBuffer(data.length)).toString(data.encoding);
			}
		}

		return result as T;
	}

	/**
	 * Zod-like safe parsing. If `success` is true, `data` contains the parsed data. Otherwise `error` contains any parsing errors
	 *
	 * @param data - Raw binary data to parse with the current structure
	 * @returns An object containing either `success: true` and `data`, or `success: false` and `error`
	 */
	public safeParse(data: Buffer): { success: true; data: T } | { success: false; error: unknown } {
		try {
			return {
				success: true,
				data: this.parse(data)
			};
		} catch (error: unknown) {
			return {
				success: false,
				error: error
			};
		}
	}

	/**
	 * Uses the current structure to encode `parsed`. Will throw any errors that occur
	 *
	 * @param data - Object of parsed data to be coded
	 * @returns Encoded data
	 */
	public encode(parsed: T): Buffer {
		const out = Buffer.alloc(this.size());
		const stream = new BitStream(out, out.byteOffset, out.byteLength);
		const parsedKeys = Object.keys(parsed);

		for (const data of this.structure) {
			if ('name' in data && !parsedKeys.includes(data.name)) {
				throw new Error(`Failed to find data for field ${data.name}`);
			}

			if (data.type === 'set_endianness') {
				stream.bigEndian = data.endianness === 'big' ? true : false;
			}

			if (data.type === 'skip') {
				stream.index += data.bits;
				continue;
			}

			if (data.type === 'bits') {
				stream.writeBits(parsed[data.name] as number, data.bits);
			}

			if (data.type === 'boolean_bit') {
				stream.writeBits(parsed[data.name] ? 1 : 0, 1);
			}

			if (data.type === 'uint') {
				const currentEndianness = stream.bigEndian;

				if (data.bits !== 8 && data.endianness !== 'current') {
					stream.bigEndian = data.endianness === 'big' ? true : false;
				}

				const value = parsed[data.name] as number;

				data.bits === 8 ? stream.writeUint8(value) : data.bits === 16 ? stream.writeUint16(value) : stream.writeUint32(value);

				stream.bigEndian = currentEndianness;
			}

			if (data.type === 'buffer') {
				(parsed[data.name] as Buffer).forEach(byte => stream.writeUint8(byte));
			}

			if (data.type === 'string') {
				const stringBuffer = Buffer.from(parsed[data.name] as string, data.encoding);
				const terminatedBuffer = Buffer.alloc(data.length);

				terminatedBuffer.set(stringBuffer);
				terminatedBuffer.forEach(byte => stream.writeUint8(byte));
			}
		}

		return out;
	}

	/**
	 * Zod-like safe encoding. If `success` is true, `data` contains the parsed data. Otherwise `error` contains any encoding errors
	 *
	 * @param parsed - Object of parsed data to be coded
	 * @returns An object containing either `success: true` and `data`, or `success: false` and `error`
	 */
	public safeEncode(parsed: T): { success: true; data: Buffer } | { success: false; error: unknown } {
		try {
			return {
				success: true,
				data: this.encode(parsed)
			};
		} catch (error) {
			return {
				success: false,
				error: error
			};
		}
	}

	/**
	 * Calculates the byte size based on the given structure
	 *
	 * @returns The number of bytes the structure requires
	 */
	public size(): number {
		let bits = 0;

		for (const data of this.structure) {
			bits += data.bits;
		}

		return Math.ceil(bits / 8);
	}
}