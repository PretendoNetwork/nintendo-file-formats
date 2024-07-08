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

	constructor(pathOrBuffer: string | Buffer) {
		this.stream = new FileStream(pathOrBuffer);

		this.parse();
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

		this.CACertificate = new Certificate(this.stream);
		this.ticketCertificate = new Certificate(this.stream);
		this.TMDCertificate = new Certificate(this.stream);
		this.stream.alignBlock(BLOCK_SIZE);

		// TODO - Use the above certificates to validate the below signatures. It always fails right now?

		this.ticket = new Ticket(this.stream.readBytes(this.ticketSize));
		this.stream.alignBlock(BLOCK_SIZE);

		this.TMD = new TMD(this.stream.readBytes(this.TMDSize));
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
				iconData: new SMDH(this.stream),
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