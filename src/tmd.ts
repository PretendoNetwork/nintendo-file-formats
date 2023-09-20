import { Stream } from '@/stream';
import { Certificate } from '@/certificate';
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

export class TMD {
	private stream: Stream;
	public signatureType: number;
	public signature: Buffer;
	public issuer: string;
	public version: number;
	public caVersion: number;
	public signerVersion: number;
	public reserved1: number;
	public systemVersion: bigint;
	public titleID: bigint;
	public titleType: number;
	public groupID: number;
	public saveDataSize: number;
	public SRLPrivateSaveDataSize: number;
	public reserved2: number;
	public SRLFlag: number;
	public reserved3: Buffer;
	public accessRights: number;
	public titleVersion: number;
	public contentCount: number;
	public bootIndex: number;
	public minorVersion: number;
	public contentInfoRecordsHash: Buffer; // * Only seen if version is <= 1
	public contentInfoRecords: ContentInfoRecord[]; // * Only seen if version is <= 1
	public contentChunkRecords: ContentChunkRecord[] = [];
	public selfCertificate: Certificate; // * Only seen if TMD came from the CDN. Verifies the TMD signature
	public CACertificate: Certificate; // * Only seen if TMD came from the CDN. Verifies the TMDCertificate signature

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
	}

	private parseSignature(): void {
		this.signatureType = this.stream.readUInt32BE();

		const signatureSize = getSignatureSize(this.signatureType);

		this.signature = this.stream.readBytes(signatureSize.SIGNATURE);
		this.stream.skip(signatureSize.PADDING);
	}
}