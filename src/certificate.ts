import crypto from 'node:crypto';
import NodeRSA from 'node-rsa';
import { FileStream } from '@/file-stream';
import { getSignatureSize } from '@/signatures';

const KeyTypes = {
	RSA_4096: 0x0,
	RSA_2048: 0x1,
	ECDSA_233R1: 0x2
};

export interface SignedData {
	signature: Buffer;
	signatureBody: Buffer;
}

export class Certificate {
	private stream: FileStream;
	public signatureType: number;
	public signature: Buffer;
	public issuer: string;
	public keyType: number; // TODO - Union of KeyTypes values?
	public name: string;
	public expiration: number;
	public publicKeyData: Buffer;
	public signatureBody: Buffer; // * Used to verify the signature

	constructor(fdOrCertificateOrStream: number | string | Buffer | FileStream) {
		if (typeof fdOrCertificateOrStream === 'string') {
			this.stream = new FileStream(Buffer.from(fdOrCertificateOrStream, 'base64'));
		} else if (fdOrCertificateOrStream instanceof FileStream) {
			this.stream = fdOrCertificateOrStream;
		} else {
			this.stream = new FileStream(fdOrCertificateOrStream);
		}

		this.parse();
	}

	public size(): number {
		let bufferSize = 0;

		bufferSize += 0x4; // * Signature type
		bufferSize += getSignatureSize(this.signatureType).TOTAL; // * Signature + padding
		bufferSize += 0x40; // * issuer
		bufferSize += 0x4;  // * keyType
		bufferSize += 0x40; // * name
		bufferSize += 0x4;  // * expiration
		bufferSize += this.publicKeyData.length;

		return bufferSize;
	}

	public bytes(): Buffer {
		const bytes = Buffer.alloc(this.size());

		// * Offset to the data after the signature + padding
		const dataOffset = 0x4 + getSignatureSize(this.signatureType).TOTAL;

		bytes.writeUInt32BE(this.signatureType, 0x0);
		this.signature.copy(bytes, 0x4);
		this.signatureBody.copy(bytes, dataOffset);

		return bytes;
	}

	private parse(): void {
		this.parseSignature();
		this.issuer = this.stream.readBytes(0x40).toString().split('\0')[0];
		this.keyType = this.stream.readUInt32BE(); // TODO - Validate this?
		this.name = this.stream.readBytes(0x40).toString().split('\0')[0];
		this.expiration = this.stream.readUInt32BE();
		this.readPublicKeyData();
		this.constructSignatureData();
	}

	private parseSignature(): void {
		this.signatureType = this.stream.readUInt32BE();

		const signatureSize = getSignatureSize(this.signatureType);

		this.signature = this.stream.readBytes(signatureSize.SIGNATURE);
		this.stream.skip(signatureSize.PADDING);
	}

	public verifySignature(signedData: SignedData): boolean {
		switch (this.keyType) {
			case KeyTypes.RSA_4096:
			case KeyTypes.RSA_2048:
				return this.verifySignatureRSASHA256(signedData);
			case KeyTypes.ECDSA_233R1:
				return this.verifySignatureECDSASHA256(signedData);
		}

		return false;
	}

	private verifySignatureRSASHA256(signedData: SignedData): boolean {
		const publicKey = new NodeRSA();

		publicKey.importKey(this.exportKey(), 'pkcs1-public-pem');

		return publicKey.verify(signedData.signatureBody, signedData.signature);
	}

	private verifySignatureECDSASHA256(signedData: SignedData): boolean {
		const key: crypto.VerifyPublicKeyInput = {
			key: this.exportKey(),
			dsaEncoding: 'ieee-p1363'
		};

		return crypto.verify('sha256', signedData.signatureBody, key, signedData.signature);
	}

	public exportKey(): string {
		switch (this.keyType) {
			case KeyTypes.RSA_4096:
				return this.exportKeyRSA4096();
			case KeyTypes.RSA_2048:
				return this.exportKeyRSA2048();
			case KeyTypes.ECDSA_233R1:
				return this.exportKeyECDSA233R1();
			default:
				throw new Error(`Unknown certificate key type 0x${this.keyType.toString(16)}`);
		}
	}

	private exportKeyRSA4096(): string {
		const publicKey = new NodeRSA();

		publicKey.importKey({
			n: this.publicKeyData.subarray(0x0, 0x200),
			e: this.publicKeyData.subarray(0x200, 0x204)
		}, 'components-public');

		return publicKey.exportKey('pkcs1-public-pem');
	}

	private exportKeyRSA2048(): string {
		const publicKey = new NodeRSA();

		publicKey.importKey({
			n: this.publicKeyData.subarray(0x0, 0x100),
			e: this.publicKeyData.subarray(0x100, 0x104)
		}, 'components-public');

		return publicKey.exportKey('pkcs1-public-pem');
	}

	private exportKeyECDSA233R1(): string {
		const publicKeyBytes = Buffer.concat([
			Buffer.from([ 0x4 ]), // * Uncompressed key (I think it's uncompressed?)
			this.publicKeyData.subarray(0x0, 0x3C)
		]);

		const der = Buffer.concat([
			Buffer.from([ // * sect233r1 DER public key header
				0x30, 0x52, 0x30, 0x10, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce,
				0x3d, 0x02, 0x01, 0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x1b,
				0x03, 0x3e, 0x00
			]),
			publicKeyBytes
		]);

		const keyObject = crypto.createPublicKey({
			key: der,
			type: 'spki',
			format: 'der'
		});

		return keyObject.export({
			type: 'spki',
			format: 'pem'
		}).toString();
	}

	private readPublicKeyData(): void {
		switch (this.keyType) {
			case KeyTypes.RSA_4096:
				this.publicKeyData = this.stream.readBytes(0x200 + 0x4 + 0x34);
				break;
			case KeyTypes.RSA_2048:
				this.publicKeyData = this.stream.readBytes(0x100 + 0x4 + 0x34);
				break;
			case KeyTypes.ECDSA_233R1:
				this.publicKeyData = this.stream.readBytes(0x3C + 0x3C);
				break;
			default:
				throw new Error(`Unknown certificate key type 0x${this.keyType.toString(16)}`);
		}
	}

	private constructSignatureData(): void {
		const body = Buffer.alloc(0x40 + 0x4 + 0x40 + 0x4);

		body.write(this.issuer, 0x0, 0x40);
		body.writeUint32BE(this.keyType, 0x40);
		body.write(this.name, 0x44, 0x40);
		body.writeUint32BE(this.expiration, 0x84);

		this.signatureBody = Buffer.concat([
			body,
			this.publicKeyData
		]);
	}
}