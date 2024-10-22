import FileStream from '@/file-stream';

const MSBT_MAGIC = Buffer.from('MsgStdBn');
const BIG_ENDIAN = Buffer.from('FEFF', 'hex');
const LITTLE_ENDIAN = Buffer.from('FFFE', 'hex');
const NULL_TERM = Buffer.from('0000', 'hex');

export default class MSBT {
	private stream: FileStream;
	private sectionsCount: number;

	/**
	 * Unknown
	 */
	public labels: { label: string; id: number; }[] = [];

	/**
	 * Text messages
	 */
	public messages: string[] = [];

	/**
	 * Text attributes
	 */
	public attributes: Buffer[] = [];

	/**
	 * Text styles
	 */
	public textStyles: string[] = [];

	/**
	 * Unknown
	 */
	public nodeLabels: number[] = [];

	/**
	 * Parses the MSBT from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public parseFromFile(fdOrPath: number | string): void {
		this.stream = new FileStream(fdOrPath);
		this.parse();
	}

	/**
	 * Parses the MSBT from the provided `buffer`
	 *
	 * @param buffer - MSBT data buffer
	 */
	public parseFromBuffer(buffer: Buffer): void {
		this.stream = new FileStream(buffer);
		this.parse();
	}

	/**
	 * Parses the MSBT from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded MSBT data
	 */
	public parseFromString(base64: string): void {
		this.parseFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Parses the MSBT from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `MSBT` and
	 * parses the MSBT from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public static fromFile(fdOrPath: number | string): MSBT {
		const msbt = new MSBT();
		msbt.parseFromFile(fdOrPath);

		return msbt;
	}

	/**
	 * Creates a new instance of `MSBT` and
	 * parses the MSBT from the provided `buffer`
	 *
	 * @param buffer - MSBT data buffer
	 */
	public static fromBuffer(buffer: Buffer): MSBT {
		const msbt = new MSBT();
		msbt.parseFromBuffer(buffer);

		return msbt;
	}

	/**
	 * Creates a new instance of `MSBT` and
	 * parses the MSBT from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded MSBT data
	 */
	public static fromString(base64: string): MSBT {
		const msbt = new MSBT();
		msbt.parseFromString(base64);

		return msbt;
	}

	/**
	 * Creates a new instance of `MSBT` and
	 * parses the MSBT from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): MSBT {
		const msbt = new MSBT();
		msbt.parseFromFileStream(stream);

		return msbt;
	}

	/**
	 * Parses the MSBT from the input source provided at instantiation
	 */
	public parse(): void {
		// TODO - Refactor this to not need to jump around?
		this.stream.consumeAll(); // * Read the whole file into memory since we need to jump around

		const magic = this.stream.readBytes(0x8);

		if (!MSBT_MAGIC.equals(magic)) {
			throw new Error('Invalid MSBT magic');
		}

		const bom = this.stream.readBytes(0x2);

		if (!LITTLE_ENDIAN.equals(bom) && !BIG_ENDIAN.equals(bom)) {
			throw new Error('Invalid BOM indicator');
		}

		if (BIG_ENDIAN.equals(bom)) {
			this.stream.bom = 'be';
		}

		this.stream.skip(0x2); // * Unknown. Always 0x0000
		this.stream.skip(0x2); // * Unknown. Always 0x0103
		this.sectionsCount = this.stream.readUInt16();
		this.stream.skip(0x2); // * Unknown. Always 0x0000
		this.stream.skip(0x4); // * File size
		this.stream.skip(10); // * Unknown. Always 0

		for (let i = 0; i < this.sectionsCount; i++) {
			const sectionMagic = this.stream.readBytes(0x4).toString();
			const sectionSize = this.stream.readUInt32();
			this.stream.skip(0x8); // * Unknown. Always 0

			const base = this.stream.tell();

			switch (sectionMagic) {
				case 'LBL1':
					this.parseLBL1();
					break;

				case 'ATR1':
					this.parseATR1();
					break;

				case 'TXT2':
					this.parseTXT2();
					break;

				case 'TSY1':
					this.parseTSY1();
					break;
				case 'NLI1':
					this.parseNLI1();
					break;
				default:
					throw new Error('Invalid section magic');
			}

			let endpos = base + sectionSize;
			endpos += 0x10 - (endpos % 0x10 || 0x10);

			this.stream.seek(endpos);
		}
	}

	private parseLBL1(): void {
		const base = this.stream.tell();

		const numberHashTableSlots = this.stream.readUInt32();

		for (let i = 0; i < numberHashTableSlots; i++) {
			const numberOfLabels = this.stream.readUInt32();
			const labelOffset = this.stream.readUInt32();

			const tmpPos = this.stream.tell();
			this.stream.seek(base + labelOffset);

			for (let i = 0; i < numberOfLabels; i++) {
				const length = this.stream.readUInt8();
				const label = this.stream.readBytes(length).toString();
				const id = this.stream.readUInt32();

				this.labels.push({ label, id });
			}

			this.stream.seek(tmpPos);
		}
	}

	private parseATR1(): void {
		const base = this.stream.tell();
		const messageCount = this.stream.readUInt32(); // * Should be same as LBL1
		const attributeSize = this.stream.readUInt32();

		if (attributeSize > 0) {
			for (let i = 0; i < messageCount; i++) {
				const attributeOffset = this.stream.readUInt32();
				const tmpPos = this.stream.tell();

				this.stream.seek(base + attributeOffset);

				const attribute = this.stream.readBytes(attributeSize);

				this.attributes.push(attribute);

				this.stream.seek(tmpPos);
			}
		}
	}

	private parseTXT2(): void {
		const base = this.stream.tell();
		const messageCount = this.stream.readUInt32();

		for (let i = 0; i < messageCount; i++) {
			const messageOffset = this.stream.readUInt32();
			const chars = [];

			const tmpPos = this.stream.tell();
			this.stream.seek(base + messageOffset);

			while (!Buffer.from([this.stream.peek(), this.stream.peek(this.stream.tell()+1) ]).equals(NULL_TERM)) {
				const char = this.stream.readUInt8();
				chars.push(char);
			}

			let charBuffer = Buffer.from(chars);

			if (this.stream.bom === 'be') {
				charBuffer = charBuffer.swap16();
			}

			this.messages.push(charBuffer.toString('utf16le'));

			this.stream.seek(tmpPos);
		}
	}

	private parseNLI1(): void {
		const entryCount = this.stream.readUInt32();
		for (let i = 0; i < entryCount; i++) {
			// * For MK8 MSBT, when this is parsed, the TXT2 array is empty.
			const messageID = this.stream.readUInt32();
			const txt2Index = this.stream.readUInt32();
			this.nodeLabels[messageID] = txt2Index;
		}
	}

	private parseTSY1(): void {}
}