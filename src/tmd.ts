import Stream from '@/stream';
import Certificate from '@/certificate';
import { getSignatureSize } from '@/signatures';

export interface ContentInfoRecord {
	offset: number;
	count: number;
	recordsHash: Buffer;
}

export interface ContentChunkRecord {
	id: number;
	index: number;
	type: number;
	size: bigint;
	hash: Buffer;
}

export default class TMD {
	private stream: Stream;

	/**
	 * The type of signature the data is signed with
	 */
	public signatureType: number;

	/**
	 * The signature data
	 */
	public signature: Buffer;

	/**
	 * The name of the issuer
	 */
	public issuer: string;

	/**
	 * TMD version
	 */
	public version: number;

	/**
	 * Version of the certificate used to verify the `selfCertificate` signature?
	 */
	public caVersion: number;

	/**
	 * `selfCertificate` certificate version?
	 */
	public signerVersion: number;

	/**
	 * Unused
	 */
	public reserved1: number; // * 1 byte

	/**
	 * Minimum system version?
	 */
	public systemVersion: bigint;

	/**
	 * Title ID of the title the TMD is for
	 */
	public titleID: bigint;

	/**
	 * Type of the title the TMD is for
	 */
	public titleType: number;

	/**
	 * Unknown
	 */
	public groupID: number;

	/**
	 * Unknown
	 */
	public saveDataSize: number;

	/**
	 * Unknown
	 */
	public SRLPrivateSaveDataSize: number;

	/**
	 * Unused
	 */
	public reserved2: number;  // * 4 bytes

	/**
	 * Unknown
	 */
	public SRLFlag: number;

	/**
	 * Unused
	 */
	public reserved3: Buffer; // * 0x31 bytes

	/**
	 * Unknown
	 */
	public accessRights: number;

	/**
	 * Version of the title the TMD is for
	 */
	public titleVersion: number;

	/**
	 * Number of content records
	 */
	public contentCount: number;

	/**
	 * Unknown
	 */
	public bootIndex: number;

	/**
	 * Unknown
	 */
	public minorVersion: number;

	/**
	 * SHA256 has of the content info records
	 *
	 * Optional. Only seen if version is <= 1
	 */
	public contentInfoRecordsHash: Buffer;

	/**
	 * List of content info records.
	 * If present, this will always contain
	 * 64 entries
	 *
	 * Optional. Only seen if version is <= 1
	 */
	public contentInfoRecords: ContentInfoRecord[];

	/**
	 * List of content records
	 */
	public contentChunkRecords: ContentChunkRecord[] = [];

	/**
	 * Certificate used to verify the TMD signature
	 *
	 * Optional. Only seen if TMD came from the CDN
	 */
	public selfCertificate: Certificate;

	/**
	 * Certificate used to verify the `selfCertificate` signature
	 *
	 * Optional.  Only seen if TMD came from the CDN
	 */
	public CACertificate: Certificate;

	/**
	 * The data used to create the TMD signature
	 */
	public signatureBody: Buffer;

	constructor(tmdOrStream: string | Buffer | Stream) {
		if (tmdOrStream instanceof Stream) {
			this.stream = tmdOrStream;
		} else if (typeof tmdOrStream === 'string') {
			this.stream = new Stream(Buffer.from(tmdOrStream, 'base64'));
		} else {
			this.stream = new Stream(tmdOrStream);
		}

		this.parse();
	}

	/**
	 * Gets the size of the TMD
	 *
	 * @returns TMD size
	 */
	public size(): number {
		let bufferSize = 0;

		bufferSize += 0x4; // * Signature type
		bufferSize += getSignatureSize(this.signatureType).TOTAL; // * Signature + padding
		bufferSize += 0x40; // * issuer
		bufferSize += 0x1;  // * version
		bufferSize += 0x1;  // * caVersion
		bufferSize += 0x1;  // * signerVersion
		bufferSize += 0x1;  // * reserved1
		bufferSize += 0x8;  // * systemVersion
		bufferSize += 0x8;  // * titleID
		bufferSize += 0x4;  // * titleType
		bufferSize += 0x2;  // * groupID
		bufferSize += 0x4;  // * saveDataSize
		bufferSize += 0x4;  // * SRLPrivateSaveDataSize
		bufferSize += 0x4;  // * reserved2
		bufferSize += 0x1;  // * SRLFlag
		bufferSize += 0x31; // * reserved3
		bufferSize += 0x4;  // * accessRights
		bufferSize += 0x2;  // * titleVersion
		bufferSize += 0x2;  // * contentCount
		bufferSize += 0x2;  // * bootIndex
		bufferSize += 0x2;  // * minorVersion

		if (this.version === 1) {
			bufferSize += 0x20; // * contentInfoRecordsHash
			bufferSize += (0x2 + 0x2 + 0x20) * 64; // * 64 contentInfoRecords
		}

		bufferSize += (0x4 + 0x2 + 0x2 + 0x8 + 0x20) * this.contentCount; // * X contentChunkRecords

		if (this.selfCertificate) {
			bufferSize += this.selfCertificate.size();
		}

		if (this.CACertificate) {
			bufferSize += this.CACertificate.size();
		}

		return bufferSize;
	}

	/**
	 * Encodes the TMD data into a Buffer
	 *
	 * @returns encoded TMD
	 */
	public bytes(): Buffer {
		const bytes = Buffer.alloc(this.size());

		// * Offset to the data after the signature + padding
		const dataOffset = 0x4 + getSignatureSize(this.signatureType).TOTAL;

		bytes.writeUInt32BE(this.signatureType, 0x0);
		this.signature.copy(bytes, 0x4);
		bytes.write(this.issuer, dataOffset + 0x00);
		bytes.writeUInt8(this.version, dataOffset + 0x40);
		bytes.writeUInt8(this.caVersion, dataOffset + 0x41);
		bytes.writeUInt8(this.signerVersion, dataOffset + 0x42);
		bytes.writeUInt8(this.reserved1, dataOffset + 0x43);
		bytes.writeBigUInt64BE(this.systemVersion, dataOffset + 0x44);
		bytes.writeBigUInt64BE(this.titleID, dataOffset + 0x4C);
		bytes.writeUInt32BE(this.titleType, dataOffset + 0x54);
		bytes.writeUInt16BE(this.groupID, dataOffset + 0x58);
		bytes.writeUInt32BE(this.saveDataSize, dataOffset + 0x5A);
		bytes.writeUInt32BE(this.SRLPrivateSaveDataSize, dataOffset + 0x5E);
		bytes.writeUInt32BE(this.reserved2, dataOffset + 0x62);
		bytes.writeUInt8(this.SRLFlag, dataOffset + 0x66);
		this.reserved3.copy(bytes, dataOffset + 0x67);
		bytes.writeUInt32BE(this.accessRights, dataOffset + 0x98);
		bytes.writeUInt16BE(this.titleVersion, dataOffset + 0x9C);
		bytes.writeUInt16BE(this.contentCount, dataOffset + 0x9E);
		bytes.writeUInt16BE(this.bootIndex, dataOffset + 0xA0);
		bytes.writeUInt16BE(this.minorVersion, dataOffset + 0xA2);

		// * The offset can differ here, time to store it
		let offset = dataOffset + 0xA4;

		if (this.version === 1) {
			this.contentInfoRecordsHash.copy(bytes, offset);
			offset += 0x20;

			for (const record of this.contentInfoRecords) {
				bytes.writeUInt16BE(record.offset, offset);
				offset += 2;

				bytes.writeUInt16BE(record.count, offset);
				offset += 2;

				record.recordsHash.copy(bytes, offset);
				offset += 0x20;
			}
		}

		for (const record of this.contentChunkRecords) {
			bytes.writeUInt32BE(record.id, offset);
			offset += 4;

			bytes.writeUInt16BE(record.index, offset);
			offset += 2;

			bytes.writeUInt16BE(record.type, offset);
			offset += 2;

			bytes.writeBigUInt64BE(record.size, offset);
			offset += 8;

			record.hash.copy(bytes, offset);
			offset += 0x20;
		}

		if (this.selfCertificate) {
			this.selfCertificate.bytes().copy(bytes, offset);
			offset += this.selfCertificate.size();
		}

		if (this.CACertificate) {
			this.CACertificate.bytes().copy(bytes, offset);
		}

		return bytes;
	}

	private parse(): void {
		this.parseSignature();
		this.issuer = this.stream.readBytes(0x40).toString().split('\0')[0];
		this.version = this.stream.readUInt8();
		this.caVersion = this.stream.readUInt8();
		this.signerVersion = this.stream.readUInt8();
		this.reserved1 = this.stream.readUInt8();
		this.systemVersion = this.stream.readUInt64BE();
		this.titleID = this.stream.readUInt64BE();
		this.titleType = this.stream.readUInt32BE();
		this.groupID = this.stream.readUInt16BE();
		this.saveDataSize = this.stream.readUInt32BE();
		this.SRLPrivateSaveDataSize = this.stream.readUInt32BE();
		this.reserved2 = this.stream.readUInt32BE();
		this.SRLFlag = this.stream.readUInt8();
		this.reserved3 = this.stream.readBytes(0x31);
		this.accessRights = this.stream.readUInt32BE();
		this.titleVersion = this.stream.readUInt16BE();
		this.contentCount = this.stream.readUInt16BE();
		this.bootIndex = this.stream.readUInt16BE();
		this.minorVersion = this.stream.readUInt16BE();

		if (this.version === 1) {
			this.contentInfoRecordsHash = this.stream.readBytes(0x20);
			this.contentInfoRecords = [];

			// * Always 64, even if not all are used
			for (let i = 0; i < 64; i++) {
				this.contentInfoRecords.push({
					offset: this.stream.readUInt16BE(),
					count: this.stream.readUInt16BE(),
					recordsHash: this.stream.readBytes(0x20)
				});
			}
		}

		for (let i = 0; i < this.contentCount; i++) {
			this.contentChunkRecords.push({
				id: this.stream.readUInt32BE(),
				index: this.stream.readUInt16BE(),
				type: this.stream.readUInt16BE(),
				size: this.stream.readUInt64BE(),
				hash: this.stream.readBytes(0x20),
			});
		}

		if (this.stream.remaining() !== 0) {
			this.selfCertificate = new Certificate(this.stream);
			this.CACertificate = new Certificate(this.stream);
		}

		this.constructSignatureData();
	}

	private parseSignature(): void {
		this.signatureType = this.stream.readUInt32BE();

		const signatureSize = getSignatureSize(this.signatureType);

		this.signature = this.stream.readBytes(signatureSize.SIGNATURE);
		this.stream.skip(signatureSize.PADDING);
	}

	private constructSignatureData(): void {
		let size = 0xA4;

		if (this.version === 1) {
			size += 0x20;
		}

		this.signatureBody = Buffer.alloc(size);

		this.signatureBody.write(this.issuer, 0x00);
		this.signatureBody.writeUInt8(this.version, 0x40);
		this.signatureBody.writeUInt8(this.caVersion, 0x41);
		this.signatureBody.writeUInt8(this.signerVersion, 0x42);
		this.signatureBody.writeUInt8(this.reserved1, 0x43);
		this.signatureBody.writeBigUInt64BE(this.systemVersion, 0x44);
		this.signatureBody.writeBigUInt64BE(this.titleID, 0x4C);
		this.signatureBody.writeUInt32BE(this.titleType, 0x54);
		this.signatureBody.writeUInt16BE(this.groupID, 0x58);
		this.signatureBody.writeUInt32BE(this.saveDataSize, 0x5A);
		this.signatureBody.writeUInt32BE(this.SRLPrivateSaveDataSize, 0x5E);
		this.signatureBody.writeUInt32BE(this.reserved2, 0x62);
		this.signatureBody.writeUInt8(this.SRLFlag, 0x66);
		this.reserved3.copy(this.signatureBody, 0x67);
		this.signatureBody.writeUInt32BE(this.accessRights, 0x98);
		this.signatureBody.writeUInt16BE(this.titleVersion, 0x9C);
		this.signatureBody.writeUInt16BE(this.contentCount, 0x9E);
		this.signatureBody.writeUInt16BE(this.bootIndex, 0xA0);
		this.signatureBody.writeUInt16BE(this.minorVersion, 0xA2);

		if (this.version === 1) {
			this.contentInfoRecordsHash.copy(this.signatureBody, 0xA4);
		}
	}
}