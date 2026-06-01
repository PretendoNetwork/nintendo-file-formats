import FileStream from '@/file-stream';

const ME01_MAGIC = Buffer.from('ME01');
const SA01_MAGIC = Buffer.from('SA01');

/**
 * ME01 represents a data archive file. These files can have the magic `ME01` or `SA01`
 */
export default class ME01 {
	private stream: FileStream;

	/**
	 * Files in the archive
	 */
	public files: { name: string; data: Buffer }[] = [];

	/**
	 * Parses the ME01 from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public parseFromFile(fdOrPath: number | string): void {
		this.stream = new FileStream(fdOrPath);
		this.parse();
	}

	/**
	 * Parses the ME01 from the provided `buffer`
	 *
	 * @param buffer - ME01 data buffer
	 */
	public parseFromBuffer(buffer: Buffer): void {
		this.stream = new FileStream(buffer);
		this.parse();
	}

	/**
	 * Parses the ME01 from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded ME01 data
	 */
	public parseFromString(base64: string): void {
		this.parseFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Parses the ME01 from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `ME01` and
	 * parses the ME01 from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public static fromFile(fdOrPath: number | string): ME01 {
		const me01 = new ME01();
		me01.parseFromFile(fdOrPath);

		return me01;
	}

	/**
	 * Creates a new instance of `ME01` and
	 * parses the ME01 from the provided `buffer`
	 *
	 * @param buffer - ME01 data buffer
	 */
	public static fromBuffer(buffer: Buffer): ME01 {
		const me01 = new ME01();
		me01.parseFromBuffer(buffer);

		return me01;
	}

	/**
	 * Creates a new instance of `ME01` and
	 * parses the ME01 from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded ME01 data
	 */
	public static fromString(base64: string): ME01 {
		const me01 = new ME01();
		me01.parseFromString(base64);

		return me01;
	}

	/**
	 * Creates a new instance of `ME01` and
	 * parses the ME01 from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): ME01 {
		const me01 = new ME01();
		me01.parseFromFileStream(stream);

		return me01;
	}

	/**
	 * Parses the ME01 from the input source provided at instantiation
	 */
	public parse(): void {
		// * I couldn't find any docs or wikis about this file format,
		// * so I'm basing this mostly off Switch-Toolbox
		// * https://github.com/KillzXGaming/Switch-Toolbox/blob/43c847c85900273dc4ff0366fad8ef29f32db4bd/File_Format_Library/FileFormats/Archives/ME01.cs

		const magic = this.stream.readBytes(0x4);

		if (!ME01_MAGIC.equals(magic) && !SA01_MAGIC.equals(magic)) {
			throw new Error('Invalid ME01 magic');
		}

		if (SA01_MAGIC.equals(magic)) {
			this.stream.bom = 'be';
		}

		const fileCount = this.stream.readUInt32();
		const fileDataOffset = this.stream.readUInt32(); // * Switch-Toolbox names this "Alignment"?

		const dataOffsets = Array.from({ length: fileCount }, () => this.stream.readUInt32());
		const dataSizes = Array.from({ length: fileCount }, () => this.stream.readUInt32());
		const fileNames: string[] = [];

		// * Switch-Toolbox reads this slightly differently. It reads the padding to find the
		// * next offset, but it seems like they're always in 0x80 length chunks
		for (let i = 0; i < fileCount; i++) {
			const block = this.stream.readBytes(0x80);
			const fileName = block.toString().split('\0')[0];

			fileNames.push(fileName);
		}

		// * Switch-Toolbox does this slightly differently. It reads the padding to find the
		// * file data offset, but this seems like it can be skipped by just jumping right to
		// * value it calls "Alignment"? Doing so saves reads
		this.stream.seek(fileDataOffset);

		// * Switch-Toolbox reads this slightly differently. It reads the padding to find the
		// * next offset, but this seems like it can be skipped by just jumping right to the
		// * next file, saving reads
		for (let i = 0; i < fileCount; i++) {
			const fileOffset = dataOffsets[i];
			const fileName = fileNames[i];
			const fileSize = dataSizes[i];

			this.stream.seek(fileDataOffset + fileOffset);

			const fileData = this.stream.readBytes(fileSize);

			this.files.push({
				name: fileName,
				data: fileData
			});
		}
	}
}
