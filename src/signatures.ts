export const SIGNATURE_SIZES = {
	RSA_4096_SHA1: {
		SIGNATURE: 0x200,
		PADDING: 0x3C,
		TOTAL: 0x200 + 0x3C
	},
	RSA_2048_SHA1: {
		SIGNATURE: 0x100,
		PADDING: 0x3C,
		TOTAL: 0x100 + 0x3C
	},
	ELLIPTIC_CURVE_SHA1: {
		SIGNATURE: 0x3C,
		PADDING: 0x40,
		TOTAL: 0x3C + 0x40
	},
	RSA_4096_SHA256: {
		SIGNATURE: 0x200,
		PADDING: 0x3C,
		TOTAL: 0x200 + 0x3C
	},
	RSA_2048_SHA256: {
		SIGNATURE: 0x100,
		PADDING: 0x3C,
		TOTAL: 0x100 + 0x3C
	},
	ECDSA_233R1_SHA256: {
		SIGNATURE: 0x3C,
		PADDING: 0x40,
		TOTAL: 0x3C + 0x40
	}
} as const;

export interface SignatureSize {
	SIGNATURE: number;
	PADDING: number;
	TOTAL: number;
}

/**
 * Gets the size of a signature section for a given signature type
 *
 * Many file formats contain signatures with padding.
 * This is used to know how much data the signature uses
 *
 * @param signatureType - The type of signature being checked
 * @returns the signature size data
 */
export function getSignatureSize(signatureType: number): SignatureSize {
	switch (signatureType) {
		case 0x10000:
			return SIGNATURE_SIZES.RSA_4096_SHA1;
		case 0x10001:
			return SIGNATURE_SIZES.RSA_2048_SHA1;
		case 0x10002:
			return SIGNATURE_SIZES.ELLIPTIC_CURVE_SHA1;
		case 0x10003:
			return SIGNATURE_SIZES.RSA_4096_SHA256;
		case 0x10004:
			return SIGNATURE_SIZES.RSA_2048_SHA256;
		case 0x10005:
			return SIGNATURE_SIZES.ECDSA_233R1_SHA256;
		default:
			throw new Error(`Unknown signature type 0x${signatureType.toString(16)}`);
	}
}