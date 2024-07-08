import Stream from '@/stream';
import Certificate from '@/certificate';
import { getSignatureSize } from '@/signatures';

export default class Ticket {
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
	 * Public ECC key data
	 */
	public publicECCKey: Buffer;

	/**
	 * Ticket version
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
	 * Title installation key, encrypted
	 */
	public encryptedTitleKey: Buffer;

	/**
	 * Unused
	 */
	public reserved1: number; // * 1 byte

	/**
	 * Unique ticket ID
	 */
	public ticketID: bigint;

	/**
	 * ID of the console the ticket is assigned to
	 */
	public consoleID: number;

	/**
	 * Title ID of the title the ticket is for
	 */
	public titleID: bigint;

	/**
	 * Unused
	 */
	public reserved2: number; // * 2 bytes

	/**
	 * Version of the title the ticket is for
	 */
	public titleVersion: number;

	/**
	 * Unused
	 */
	public reserved3: bigint;

	/**
	 * Unknown use
	 */
	public licenseType: number;

	/**
	 * Index to the common keyY for the ticket (3DS). Unknown on Wii U
	 */
	public commonKeyYIndex: number;

	/**
	 * Unused
	 */
	public reserved4: Buffer; // * 0x2A reserved bytes

	/**
	 * ID of the SOAP account the ticket is assigned to
	 */
	public eShopAccountID: number;

	/**
	 * Unused
	 */
	public reserved5: number;

	/**
	 * Unknown
	 */
	public audit: number; // * What is this?

	/**
	 * Unused
	 */
	public reserved6: Buffer; // * 0x42 reserved bytes

	/**
	 * Unknown
	 */
	public limits: Buffer; // * What is this?

	/**
	 * Unknown
	 */
	public contentIndex: Buffer; // * Is this the same data in the TMD?

	/**
	 * Certificate used to verify the ticket signature
	 *
	 * Optional. Only seen if ticket came from the CDN
	 */
	public selfCertificate?: Certificate;

	/**
	 * Certificate used to verify the `selfCertificate` signature
	 *
	 * Optional.  Only seen if ticket came from the CDN
	 */
	public CACertificate?: Certificate;

	/**
	 * The data used to create the ticket signature
	 */
	public signatureBody: Buffer;

	constructor(ticketOrStream: string | Buffer | Stream) {
		if (ticketOrStream instanceof Stream) {
			this.stream = ticketOrStream;
		} else if (typeof ticketOrStream === 'string') {
			this.stream = new Stream(Buffer.from(ticketOrStream, 'base64'));
		} else {
			this.stream = new Stream(ticketOrStream);
		}

		this.parse();
	}

	/**
	 * Gets the size of the Ticket
	 *
	 * @returns Ticket size
	 */
	public size(): number {
		let bufferSize = 0;

		bufferSize += 0x4; // * Signature type
		bufferSize += getSignatureSize(this.signatureType).TOTAL; // * Signature + padding
		bufferSize += 0x40; // * issuer
		bufferSize += 0x3C; // * publicECCKey
		bufferSize += 0x1;  // * version
		bufferSize += 0x1;  // * caVersion
		bufferSize += 0x1;  // * signerVersion
		bufferSize += 0x10; // * encryptedTitleKey
		bufferSize += 0x1;  // * reserved1
		bufferSize += 0x8;  // * ticketID
		bufferSize += 0x4;  // * consoleID
		bufferSize += 0x8;  // * titleID
		bufferSize += 0x2;  // * reserved2
		bufferSize += 0x2;  // * titleVersion
		bufferSize += 0x8;  // * reserved3
		bufferSize += 0x1;  // * licenseType
		bufferSize += 0x1;  // * commonKeyYIndex
		bufferSize += 0x2A; // * reserved4
		bufferSize += 0x4;  // * eShopAccountID
		bufferSize += 0x1;  // * reserved5
		bufferSize += 0x1;  // * audit
		bufferSize += 0x42; // * reserved6
		bufferSize += 0x40; // * limits
		bufferSize += this.contentIndex.length;

		if (this.selfCertificate) {
			bufferSize += this.selfCertificate.size();
		}

		if (this.CACertificate) {
			bufferSize += this.CACertificate.size();
		}

		return bufferSize;
	}

	/**
	 * Encodes the Ticket data into a Buffer
	 *
	 * @returns encoded Ticket
	 */
	public bytes(): Buffer {
		const bytes = Buffer.alloc(this.size());

		// * Offset to the data after the signature + padding
		const dataOffset = 0x4 + getSignatureSize(this.signatureType).TOTAL;

		bytes.writeUInt32BE(this.signatureType, 0x0);
		this.signature.copy(bytes, 0x4);
		bytes.write(this.issuer, dataOffset + 0x00);
		this.publicECCKey.copy(bytes, dataOffset + 0x40);
		bytes.writeUInt8(this.version, dataOffset + 0x7C);
		bytes.writeUInt8(this.caVersion, dataOffset + 0x7D);
		bytes.writeUInt8(this.signerVersion, dataOffset + 0x7E);
		this.encryptedTitleKey.copy(bytes, dataOffset + 0x7F);
		bytes.writeUInt8(this.reserved1, dataOffset + 0x8F);
		bytes.writeBigUInt64BE(this.ticketID, dataOffset + 0x90);
		bytes.writeUInt32BE(this.consoleID, dataOffset + 0x98);
		bytes.writeBigUInt64BE(this.titleID, dataOffset + 0x9C);
		bytes.writeUInt16BE(this.reserved2, dataOffset + 0xA4);
		bytes.writeUInt16BE(this.titleVersion, dataOffset + 0xA6);
		bytes.writeBigUInt64BE(this.reserved3, dataOffset + 0xA8);
		bytes.writeUInt8(this.licenseType, dataOffset + 0xB0);
		bytes.writeUInt8(this.commonKeyYIndex, dataOffset + 0xB1);
		this.reserved4.copy(bytes, dataOffset + 0xB2);
		bytes.writeUInt32BE(this.eShopAccountID, dataOffset + 0xDC);
		bytes.writeUInt8(this.reserved5, dataOffset + 0xE0);
		bytes.writeUInt8(this.audit, dataOffset + 0xE1);
		this.reserved6.copy(bytes, dataOffset + 0xE2);
		this.limits.copy(bytes, dataOffset + 0x124);
		this.contentIndex.copy(bytes, dataOffset + 0x164);

		// * The offset can differ here, time to store it
		let offset = dataOffset + 0x164 + this.contentIndex.length;

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
		this.publicECCKey = this.stream.readBytes(0x3C); // * What is this?
		this.version = this.stream.readUInt8();
		this.caVersion = this.stream.readUInt8();
		this.signerVersion = this.stream.readUInt8();
		this.encryptedTitleKey = this.stream.readBytes(0x10);
		this.reserved1 = this.stream.readUInt8();
		this.ticketID = this.stream.readUInt64BE();
		this.consoleID = this.stream.readUInt32BE();
		this.titleID = this.stream.readUInt64BE();
		this.reserved2 = this.stream.readUInt16BE();
		this.titleVersion = this.stream.readUInt16BE();
		this.reserved3 = this.stream.readUInt64BE();
		this.licenseType = this.stream.readUInt8();
		this.commonKeyYIndex = this.stream.readUInt8();
		this.reserved4 = this.stream.readBytes(0x2A);
		this.eShopAccountID = this.stream.readUInt32BE();
		this.reserved5 = this.stream.readUInt8();
		this.audit = this.stream.readUInt8();
		this.reserved6 = this.stream.readBytes(0x42);
		this.limits = this.stream.readBytes(0x40);

		this.stream.skip(0x4); // * Unknown

		const contentIndexSize = this.stream.readUInt32BE();

		this.stream.skip(-0x4); // * Skip back to the number just read
		this.stream.skip(-0x4); // * Skip back to the unknown number

		this.contentIndex = this.stream.readBytes(contentIndexSize);

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
		this.signatureBody = Buffer.alloc(0x164 + this.contentIndex.length);

		this.signatureBody.write(this.issuer, 0x00);
		this.publicECCKey.copy(this.signatureBody, 0x40);
		this.signatureBody.writeUInt8(this.version, 0x7C);
		this.signatureBody.writeUInt8(this.caVersion, 0x7D);
		this.signatureBody.writeUInt8(this.signerVersion, 0x7E);
		this.encryptedTitleKey.copy(this.signatureBody, 0x7F);
		this.signatureBody.writeUInt8(this.reserved1, 0x8F);
		this.signatureBody.writeBigUInt64BE(this.ticketID, 0x90);
		this.signatureBody.writeUInt32BE(this.consoleID, 0x98);
		this.signatureBody.writeBigUInt64BE(this.titleID, 0x9C);
		this.signatureBody.writeUInt16BE(this.reserved2, 0xA4);
		this.signatureBody.writeUInt16BE(this.titleVersion, 0xA6);
		this.signatureBody.writeBigUInt64BE(this.reserved3, 0xA8);
		this.signatureBody.writeUInt8(this.licenseType, 0xB0);
		this.signatureBody.writeUInt8(this.commonKeyYIndex, 0xB1);
		this.reserved4.copy(this.signatureBody, 0xB2);
		this.signatureBody.writeUInt32BE(this.eShopAccountID, 0xDC);
		this.signatureBody.writeUInt8(this.reserved5, 0xE0);
		this.signatureBody.writeUInt8(this.audit, 0xE1);
		this.reserved6.copy(this.signatureBody, 0xE2);
		this.limits.copy(this.signatureBody, 0x124);
		this.contentIndex.copy(this.signatureBody, 0x164);
	}
}