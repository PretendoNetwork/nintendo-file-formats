import FileStream from '@/file-stream';
import Certificate from '@/certificate';
import Ticket from '@/ticket';
import TMD from '@/tmd';
import SMDH from '@/smdh';

export const BLOCK_SIZE = 0x40; // * 64 byte blocks

interface CIAContent {
	id: number;
	data: Buffer;
}

interface CIAMeta {
	dependencies: bigint[];
	reserved1: Buffer;
	coreVersion: number;
	reserved2: Buffer;
	iconData: SMDH;
}

export default class CIA {
	private stream: FileStream;
	private encryptedContents: Buffer;


	/**
	 * Unknown
	 */
	public type: number;

	/**
	 * CIA version
	 */
	public version: number;

	/**
	 * Size of the certificate chain
	 */
	public certificateChainSize: number;

	/**
	 * Size of the ticket
	 */
	public ticketSize: number;

	/**
	 * Size of the TMD
	 */
	public TMDSize: number;

	/**
	 * Size of the "meta" (metadata) section
	 */
	public metaSize: number;

	/**
	 * Size of the CIA content
	 */
	public contentSize: bigint;

	/**
	 * Unknown
	 */
	public contentIndex: Buffer;

	/**
	 * Certificate used to verify the ticket and TMD certificates signatures
	 */
	public CACertificate: Certificate;

	/**
	 * Certificate used to verify the ticket signature
	 */
	public ticketCertificate: Certificate;

	/**
	 * Certificate used to verify the TMD signature
	 */
	public TMDCertificate: Certificate;

	/**
	 * CIA title installation ticket
	 */
	public ticket: Ticket;

	/**
	 * CIA title installation TMD
	 */
	public TMD: TMD;

	/**
	 * CIA title contents
	 */
	public contents: CIAContent[] = [];

	/**
	 * CIA metadata
	 *
	 * Optional
	 */
	public meta?: CIAMeta;

	/**
	 * Parses the CIA from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public parseFromFile(fdOrPath: number | string): void {
		this.stream = new FileStream(fdOrPath);
		this.parse();
	}

	/**
	 * Parses the CIA from the provided `buffer`
	 *
	 * @param buffer - CIA data buffer
	 */
	public parseFromBuffer(buffer: Buffer): void {
		this.stream = new FileStream(buffer);
		this.parse();
	}

	/**
	 * Parses the CIA from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded CIA data
	 */
	public parseFromString(base64: string): void {
		this.parseFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Parses the CIA from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `CIA` and
	 * parses the CIA from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public static fromFile(fdOrPath: number | string): CIA {
		const cia = new CIA();
		cia.parseFromFile(fdOrPath);

		return cia;
	}

	/**
	 * Creates a new instance of `CIA` and
	 * parses the CIA from the provided `buffer`
	 *
	 * @param buffer - CIA data buffer
	 */
	public static fromBuffer(buffer: Buffer): CIA {
		const cia = new CIA();
		cia.parseFromBuffer(buffer);

		return cia;
	}

	/**
	 * Creates a new instance of `CIA` and
	 * parses the CIA from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded CIA data
	 */
	public static fromString(base64: string): CIA {
		const cia = new CIA();
		cia.parseFromString(base64);

		return cia;
	}

	/**
	 * Creates a new instance of `CIA` and
	 * parses the CIA from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): CIA {
		const cia = new CIA();
		cia.parseFromFileStream(stream);

		return cia;
	}

	private parse(): void {
		this.parseHeader();
		this.parseContentIndex();
		this.decryptContents();
	}

	private parseHeader(): void {
		const headerSize = this.stream.readUInt32LE();

		if (headerSize !== 0x2020) {
			throw new Error(`Invalid CIA header size. Expected ${0x2020}, got ${headerSize}`);
		}

		this.type = this.stream.readUInt16LE();
		this.version = this.stream.readUInt16LE();
		this.certificateChainSize = this.stream.readUInt32LE();
		this.ticketSize = this.stream.readUInt32LE();
		this.TMDSize = this.stream.readUInt32LE();
		this.metaSize = this.stream.readUInt32LE();
		this.contentSize = this.stream.readUInt64LE();
		this.contentIndex = this.stream.readBytes(0x2000);
		this.stream.alignBlock(BLOCK_SIZE);

		this.CACertificate = Certificate.fromFileStream(this.stream);
		this.ticketCertificate = Certificate.fromFileStream(this.stream);
		this.TMDCertificate = Certificate.fromFileStream(this.stream);
		this.stream.alignBlock(BLOCK_SIZE);

		// TODO - Use the above certificates to validate the below signatures. It always fails right now?

		this.ticket = Ticket.fromBuffer(this.stream.readBytes(this.ticketSize));
		this.stream.alignBlock(BLOCK_SIZE);

		this.TMD = TMD.fromBuffer(this.stream.readBytes(this.TMDSize));
		this.stream.alignBlock(BLOCK_SIZE);

		this.encryptedContents = this.stream.readBytes(Number(this.contentSize));

		if (this.metaSize !== 0) {
			const dependencies: bigint[] = [];

			// * Dependency list is a 0x180 block section
			// * of little-endian title IDs (8 bytes long)
			for (let i = 0; i < 0x180 / 8; i++) {
				dependencies.push(this.stream.readUInt64LE());
			}

			this.meta = {
				dependencies: dependencies,
				reserved1: this.stream.readBytes(0x180),
				coreVersion: this.stream.readUInt32LE(),
				reserved2: this.stream.readBytes(0xFC),
				iconData: SMDH.fromFileStream(this.stream),
			};
		}
	}

	private parseContentIndex(): void {
		// * Reads out all the active contents for the CIA and ensures none are missing from the TMD
		const activeContents = new Set<number>();

		for (let i = 0; i < this.contentIndex.length; i++) {
			const byte = this.contentIndex[i];
			const offset = i * 8;
			let current = byte;

			for (let j = 7; j != -1; j--) {
				if (current & 1) {
					activeContents.add(j + offset);
				}

				current = current >> 1;
			}
		}

		const activeTMDContents = new Set<number>();

		for (const record of this.TMD.contentChunkRecords) {
			if (activeContents.has(record.index)) {
				activeTMDContents.add(record.index);
			}
		}

		if (activeTMDContents.size < activeContents.size) {
			throw new Error(`TMD is missing ${activeContents.size-activeTMDContents.size} content records from the CIA content index`);
		}

		const contentsStream = new FileStream(this.encryptedContents);

		for (const record of this.TMD.contentChunkRecords) {
			this.contents.push({
				id: record.id,
				data: contentsStream.readBytes(Number(record.size))
			});
		}
	}

	private decryptContents(): void {
		// TODO
	}
}