declare module 'image-encode'{
	// * https://stackoverflow.com/a/53926269
	type TypedArray = | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

	type EncodingOptionsShape = number[]; // * [width, height]

	// * Everything is optional because there's many ways
	// * to set these options outside of this object
	interface EncodingOptionsObject {
		shape?: EncodingOptionsShape;
		width?: number;
		height?: number;
		type?: string;     // * Aliases
		format?: string;   // * Aliases
		mime?: string;     // * Aliases
		mimeType?: string; // * Aliases
	}

	type EncodingOptions = string | EncodingOptionsObject | EncodingOptionsShape;

	// * Blame the way this function implements it's arguments
	// * for why this looks like this
	// * https://github.com/dy/image-encode/blob/438120914fc1c29e552d5331f8c38516e6d69880/index.js#L9-L32
	function encode(
		data: Array<number> | TypedArray | ArrayBuffer | Buffer | ImageData,
		types: EncodingOptions,
		options?: EncodingOptions
	): ArrayBuffer;

    export default encode;
}