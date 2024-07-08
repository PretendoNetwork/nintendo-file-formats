import FileStream from '@/file-stream';

const MAGIC_BE = Buffer.from('BY');
const MAGIC_LE = Buffer.from('YB');

enum NodeTypes {
	STRING =                 0xA0, // * Any version
	BINARY_DATA =            0xA1, // * Versions 1 and 4+
	BINARY_DATA_WITH_PARAM = 0xA2, // * Version 5
	ARRAY =                  0xC0, // * Any version
	DICTIONARY =             0xC1, // * Any version
	STRING_TABLE =           0xC2, // * Any version
	BINARY_TABLE =           0xC3, // * Version 1
	BOOL =                   0xD0, // * Any version
	INT32 =                  0xD1, // * Any version
	FLOAT =                  0xD2, // * Any version
	UINT32 =                 0xD3, // * Versions 2+
	INT64 =                  0xD4, // * Versions 3+
	UINT64 =                 0xD5, // * Versions 3+
	DOUBLE =                 0xD6, // * Versions 3+
	NULL =                   0xFF  // * Any version
}

interface Node {
	type: NodeTypes.STRING | NodeTypes.BINARY_DATA | NodeTypes.BINARY_DATA_WITH_PARAM | NodeTypes.ARRAY | NodeTypes.DICTIONARY | NodeTypes.STRING_TABLE | NodeTypes.BINARY_TABLE | NodeTypes.BOOL | NodeTypes.INT32 | NodeTypes.FLOAT | NodeTypes.UINT32 | NodeTypes.INT64 | NodeTypes.UINT64 | NodeTypes.DOUBLE | NodeTypes.NULL;
	value: unknown;
}

type StringNode = {
	type: 0xA0;
	value: string;
};

type BinaryDataNode = {
	type: 0xA1;
	value: Buffer;
};

type BinaryDataWithParamNode = {
	type: 0xA2;
	value: Buffer; // TODO - What is the param?
};

type ArrayNode = {
	type: 0xC0;
	value: Node[];
};

type DictionaryNode = {
	type: 0xC1;
	value: Record<string, Node>;
};

type StringTableNode = {
	type: 0xC2;
	value: string[];
};

type BinaryTableNode = {
	type: 0xC3;
	value: Buffer[];
};

type BoolNode = {
	type: 0xD0;
	value: boolean;
};

type IntegerNode = {
	type: 0xD1;
	value: number;
};

type FloatNode = {
	type: 0xD2;
	value: number;
};

type UnsignedIntegerNode = {
	type: 0xD3;
	value: number;
};

type Integer64Node = {
	type: 0xD4;
	value: bigint;
};

type UnsignedInteger64Node = {
	type: 0xD5;
	value: bigint;
};

type DoubleNode = {
	type: 0xD6;
	value: number;
};

type NullNode = {
	type: 0xFF;
	value: null;
};

type RootNode = DictionaryNode | ArrayNode;

export default class BYAML {
	private stream: FileStream;
	private dictionaryKeyTable: StringTableNode;
	private stringTable: StringTableNode;
	private binaryDataTable: BinaryTableNode; // * Only seen in older versions
	private rootNodeOffset: number;

	/**
	 * BYAML version number
	 */
	public version: number;

	/**
	 * Root node of the file
	 */
	public rootNode: RootNode;

	/**
	 * Parses the byaml from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public parseFromFile(fdOrPath: number | string): void {
		this.stream = new FileStream(fdOrPath);
		this.parse();
	}

	/**
	 * Parses the byaml from the provided `buffer`
	 *
	 * @param buffer - BYAML data buffer
	 */
	public parseFromBuffer(buffer: Buffer): void {
		this.stream = new FileStream(buffer);
		this.parse();
	}

	/**
	 * Parses the byaml from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded byaml data
	 */
	public parseFromString(base64: string): void {
		this.parseFromBuffer(Buffer.from(base64, 'base64'));
	}

	/**
	 * Parses the byaml from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `BYAML` and
	 * parses the byaml from the provided `fdOrPath`
	 *
	 * @param fdOrPath - Either an open `fd` or a path to a file on disk
	 */
	public static fromFile(fdOrPath: number | string): BYAML {
		const byaml = new BYAML();
		byaml.parseFromFile(fdOrPath);

		return byaml;
	}

	/**
	 * Creates a new instance of `BYAML` and
	 * parses the byaml from the provided `buffer`
	 *
	 * @param buffer - BYAML data buffer
	 */
	public static fromBuffer(buffer: Buffer): BYAML {
		const byaml = new BYAML();
		byaml.parseFromBuffer(buffer);

		return byaml;
	}

	/**
	 * Creates a new instance of `BYAML` and
	 * parses the byaml from the provided string
	 *
	 * Calls `parseFromBuffer` internally
	 *
	 * @param base64 - Base64 encoded byaml data
	 */
	public static fromString(base64: string): BYAML {
		const byaml = new BYAML();
		byaml.parseFromString(base64);

		return byaml;
	}

	/**
	 * Creates a new instance of `BYAML` and
	 * parses the byaml from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): BYAML {
		const byaml = new BYAML();
		byaml.parseFromFileStream(stream);

		return byaml;
	}

	private parse(): void {
		this.parseHeader();

		this.stream.seek(this.rootNodeOffset);
		const rootNode = this.readNode();

		if (rootNode.type !== NodeTypes.ARRAY && rootNode.type !== NodeTypes.DICTIONARY) {
			throw new Error(`Invalid root node type. Expected either 0xC0 (Array) or 0xC1 (Dictionary). Got 0x${rootNode.type.toString(16).toUpperCase()}`);
		}

		this.rootNode = rootNode as RootNode; // TODO - Can this "as" call be removed?
	}

	private parseHeader(): void {
		const magic = this.stream.readBytes(2);

		if (!magic.equals(MAGIC_BE) && !magic.equals(MAGIC_LE)) {
			throw new Error(`Invalid BYAML magic. Expected either BY (big endian) or YB (little endian). Got ${magic.toString()}`);
		}

		if (magic.equals(MAGIC_BE)) {
			this.stream.bom = 'be';
		}

		this.version = this.stream.readUInt16();

		const dictionaryKeyTableOffset = this.stream.readUInt32();
		const stringTableOffset = this.stream.readUInt32();
		let binaryDataTableOffset = 0;

		// * Binary data table offset only exists in versions before v4
		if (this.version > 4) {
			// * Some games, like Splatoon, do not update the BYAML version number.
			// * To account for these cases check the offset of this table.
			if (dictionaryKeyTableOffset !== 0x10) {
				binaryDataTableOffset = this.stream.readUInt32();
			}
		}

		this.rootNodeOffset = this.stream.readUInt32();

		this.stream.seek(dictionaryKeyTableOffset+1); // * Skip the type byte
		this.dictionaryKeyTable = this.readStringTableNode();

		this.stream.seek(stringTableOffset+1); // * Skip the type byte
		this.stringTable = this.readStringTableNode();

		if (binaryDataTableOffset) {
			this.stream.seek(binaryDataTableOffset+1); // * Skip the type byte
			this.binaryDataTable = this.readBinaryTableNode();
		}
	}

	private readNode(): Node {
		const nodeType = this.stream.readUInt8();

		switch (nodeType) {
			case NodeTypes.STRING:
				return this.readStringNode();
			case NodeTypes.BINARY_DATA:
				return this.readBinaryDataNode();
			case NodeTypes.BINARY_DATA_WITH_PARAM:
				return this.readBinaryDataWithParamNode();
			case NodeTypes.ARRAY:
				return this.readArrayNode();
			case NodeTypes.DICTIONARY:
				return this.readDictionaryNode();
			case NodeTypes.STRING_TABLE:
				return this.readStringTableNode();
			case NodeTypes.BINARY_TABLE:
				return this.readBinaryTableNode();
			case NodeTypes.BOOL:
				return this.readBoolNode();
			case NodeTypes.INT32:
				return this.readIntegerNode();
			case NodeTypes.FLOAT:
				return this.readFloatNode();
			case NodeTypes.UINT32:
				return this.readUnsignedIntegerNode();
			case NodeTypes.INT64:
				return this.readInteger64Node();
			case NodeTypes.UINT64:
				return this.readUnsignedInteger64Node();
			case NodeTypes.DOUBLE:
				return this.readDoubleNode();
			case NodeTypes.NULL:
				return this.readNullNode();
			default:
				throw new Error(`Invalid node type. Got 0x${nodeType.toString(16).toUpperCase()}`);
		}
	}

	private readStringNode(): StringNode {
		// TODO - Implement this
		throw new Error('StringNodes not implemented');

		return {
			type: NodeTypes.STRING,
			value: ''
		};
	}

	private readBinaryDataNode(): BinaryDataNode {
		// TODO - Implement this
		throw new Error('BinaryDataNodes not implemented');

		return {
			type: NodeTypes.BINARY_DATA,
			value: Buffer.alloc(0)
		};
	}

	private readBinaryDataWithParamNode(): BinaryDataWithParamNode {
		// TODO - Implement this
		throw new Error('BinaryDataWithParamNodes not implemented');

		return {
			type: NodeTypes.BINARY_DATA_WITH_PARAM,
			value: Buffer.alloc(0)
		};
	}

	private readArrayNode(): ArrayNode {
		const count = this.stream.readUInt24();
		const typeTable: number[] = [];

		for (let i = 0; i < count; i++) {
			const nodeType = this.stream.readUInt8();

			typeTable.push(nodeType);
		}

		const elements: Node[] = [];

		for (const nodeType of typeTable) {
			const value = this.stream.readUInt32();

			// * Values for container nodes are offsets to the node relative to the start of the file
			if (nodeType === NodeTypes.ARRAY || nodeType === NodeTypes.DICTIONARY) {
				const before = this.stream.tell();

				this.stream.seek(value);

				elements.push(this.readNode());

				this.stream.seek(before);

				continue;
			}

			// * Values for string nodes are indexes into the string table
			if (nodeType === NodeTypes.STRING) {
				elements.push({
					type: NodeTypes.STRING,
					value: this.stringTable.value[value]
				});

				continue;
			}

			// * All other nodes are just their value. Handle some special cases
			if (nodeType === NodeTypes.BOOL) {
				elements.push({
					type: NodeTypes.BOOL,
					value: !!value
				});

				continue;
			}

			if (nodeType === NodeTypes.NULL) {
				elements.push({
					type: NodeTypes.NULL,
					value: null
				});

				continue;
			}

			elements.push({ type: nodeType, value });
		}

		return {
			type: NodeTypes.ARRAY,
			value: elements
		};
	}

	private readDictionaryNode(): DictionaryNode {
		const count = this.stream.readUInt24();
		const map: Record<string, Node> = {};

		for (let i = 0; i < count; i++) {
			const keyIndex = this.stream.readUInt24();
			const nodeType = this.stream.readUInt8();
			const value = this.stream.readUInt32();
			const key = this.dictionaryKeyTable.value[keyIndex];

			// * Values for container nodes, and new number nodes, are offsets to the node relative to the start of the file
			if (
				nodeType === NodeTypes.ARRAY ||
				nodeType === NodeTypes.DICTIONARY ||
				nodeType === NodeTypes.INT64 ||
				nodeType === NodeTypes.UINT64 ||
				nodeType === NodeTypes.DOUBLE
			) {
				const before = this.stream.tell();

				this.stream.seek(value);

				map[key] = this.readNode();

				this.stream.seek(before);

				continue;
			}

			// * Values for string nodes are indexes into the string table
			if (nodeType === NodeTypes.STRING) {
				map[key] = {
					type: NodeTypes.STRING,
					value: this.stringTable.value[value]
				};

				continue;
			}

			// * All other nodes are just their value. Handle some special cases
			if (nodeType === NodeTypes.BOOL) {
				map[key] = {
					type: NodeTypes.BOOL,
					value: !!value
				};

				continue;
			}

			if (nodeType === NodeTypes.NULL) {
				map[key] = {
					type: NodeTypes.NULL,
					value: null
				};

				continue;
			}

			map[key] = { type: nodeType, value };
		}

		return {
			type: NodeTypes.DICTIONARY,
			value: map
		};
	}

	private readStringTableNode(): StringTableNode {
		const count = this.stream.readUInt24() + 1;
		const offsetStart = this.stream.tell() - 4; // * Addresses of strings are relative to the start of the node

		const addressTable: number[] = [];

		for (let i = 0; i < count; i++) {
			const offset = this.stream.readUInt32();
			const address = offsetStart + offset;

			addressTable.push(address);
		}

		const strings: string[] = [];

		for (const address of addressTable) {
			this.stream.seek(address);

			const chars = [];
			let byte = this.stream.readUInt8();

			while (byte !== 0) {
				chars.push(byte);
				byte = this.stream.readUInt8();
			}

			strings.push(Buffer.from(chars).toString());
		}

		return {
			type: NodeTypes.STRING_TABLE,
			value: strings
		};
	}

	private readBinaryTableNode(): BinaryTableNode {
		// TODO - Implement this
		throw new Error('BinaryTableNodes not implemented');

		return {
			type: NodeTypes.BINARY_TABLE,
			value: []
		};
	}

	private readBoolNode(): BoolNode {
		// TODO - Implement this
		throw new Error('BoolNodes not implemented');

		return {
			type: NodeTypes.BOOL,
			value: false
		};
	}

	private readIntegerNode(): IntegerNode {
		// TODO - Implement this
		throw new Error('IntegerNodes not implemented');

		return {
			type: NodeTypes.INT32,
			value: 0
		};
	}

	private readFloatNode(): FloatNode {
		// TODO - Implement this
		throw new Error('FloatNodes not implemented');

		return {
			type: NodeTypes.FLOAT,
			value: 0
		};
	}

	private readUnsignedIntegerNode(): UnsignedIntegerNode {
		// TODO - Implement this
		throw new Error('UnsignedIntegerNodes not implemented');

		return {
			type: NodeTypes.UINT32,
			value: 0
		};
	}

	private readInteger64Node(): Integer64Node {
		// TODO - Implement this
		throw new Error('Integer64Nodes not implemented');

		return {
			type: NodeTypes.INT64,
			value: BigInt(0)
		};
	}

	private readUnsignedInteger64Node(): UnsignedInteger64Node {
		// TODO - Implement this
		throw new Error('UnsignedInteger64Nodes not implemented');

		return {
			type: NodeTypes.UINT64,
			value: BigInt(0)
		};
	}

	private readDoubleNode(): DoubleNode {
		// TODO - Implement this
		throw new Error('DoubleNodes not implemented');

		return {
			type: NodeTypes.DOUBLE,
			value: 0
		};
	}

	private readNullNode(): NullNode {
		// TODO - Implement this
		throw new Error('NullNodes not implemented');

		return {
			type: NodeTypes.NULL,
			value: null
		};
	}

	public toJSON(): RootNode {
		return this.rootNode;
	}
}