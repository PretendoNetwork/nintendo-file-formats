import { FileStream } from '@/file-stream';
import StreamOut from '@/stream-out';
import type StoredOffset from '@/stored-offset';

const MAGIC_BE = Buffer.from('BY');
const MAGIC_LE = Buffer.from('YB');

enum NodeTypes {
	STRING = 0xA0, // * Any version
	BINARY_DATA = 0xA1, // * Versions 1 and 4+
	BINARY_DATA_WITH_PARAM = 0xA2, // * Version 5
	ARRAY = 0xC0, // * Any version
	DICTIONARY = 0xC1, // * Any version
	STRING_TABLE = 0xC2, // * Any version
	BINARY_TABLE = 0xC3, // * Version 1
	BOOL = 0xD0, // * Any version
	INT32 = 0xD1, // * Any version
	FLOAT = 0xD2, // * Any version
	UINT32 = 0xD3, // * Versions 2+
	INT64 = 0xD4, // * Versions 3+
	UINT64 = 0xD5, // * Versions 3+
	DOUBLE = 0xD6, // * Versions 3+
	NULL = 0xFF // * Any version
}

type StringNode = {
	type: NodeTypes.STRING;
	value: string;
};

type BinaryDataNode = {
	type: NodeTypes.BINARY_DATA;
	value: Buffer;
};

type BinaryDataWithParamNode = {
	type: NodeTypes.BINARY_DATA_WITH_PARAM;
	value: Buffer; // TODO - What is the param?
};

type ArrayNode = {
	type: NodeTypes.ARRAY;
	value: Node[];
};

type DictionaryNode = {
	type: NodeTypes.DICTIONARY;
	value: Record<string, Node>;
};

type StringTableNode = {
	type: NodeTypes.STRING_TABLE;
	value: string[];
};

type BinaryTableNode = {
	type: NodeTypes.BINARY_TABLE;
	value: Buffer[];
};

type BoolNode = {
	type: NodeTypes.BOOL;
	value: boolean;
};

type IntegerNode = {
	type: NodeTypes.INT32;
	value: number;
};

type FloatNode = {
	type: NodeTypes.FLOAT;
	value: number;
};

type UnsignedIntegerNode = {
	type: NodeTypes.UINT32;
	value: number;
};

type Integer64Node = {
	type: NodeTypes.INT64;
	value: bigint;
};

type UnsignedInteger64Node = {
	type: NodeTypes.UINT64;
	value: bigint;
};

type DoubleNode = {
	type: NodeTypes.DOUBLE;
	value: number;
};

type NullNode = {
	type: NodeTypes.NULL;
	value: null;
};

type RootNode = DictionaryNode | ArrayNode;

type Node = StringNode | BinaryDataNode | BinaryDataWithParamNode | ArrayNode | DictionaryNode | StringTableNode | BinaryTableNode | BoolNode | IntegerNode | FloatNode | UnsignedIntegerNode | Integer64Node | UnsignedInteger64Node | DoubleNode | NullNode;

type PartialNode = Partial<Node>;

type BYAMLEncodeSettings = {
	version?: number;
	endianness?: 'le' | 'be';
	useBinaryTable?: boolean;
	rootNode?: RootNode;
};

export class BYAML {
	private stream: FileStream;
	private streamOut: StreamOut;
	private dictionaryKeyTable: StringTableNode = {
		type: NodeTypes.STRING_TABLE,
		value: []
	};

	private stringTable: StringTableNode = {
		type: NodeTypes.STRING_TABLE,
		value: []
	};

	private binaryDataTable: BinaryTableNode = {
		type: NodeTypes.BINARY_TABLE,
		value: []
	}; // * Only seen in some versions and in Mario Kart 8

	private rootNodeOffset: number;
	private endianness: 'le' | 'be';
	private useBinaryTable = false;

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
			this.endianness = 'be';
		} else {
			this.endianness = 'le';
		}

		this.stream.bom = this.endianness;

		this.version = this.stream.readUInt16();

		const dictionaryKeyTableOffset = this.stream.readUInt32();
		const stringTableOffset = this.stream.readUInt32();
		let binaryDataTableOffset = 0;

		// * Binary data tables only exist in some versions and in Mario Kart 8,
		// * so we need to heuristically check if it exists or not
		if (dictionaryKeyTableOffset !== 0x10) {
			binaryDataTableOffset = this.stream.readUInt32();
		}

		this.rootNodeOffset = this.stream.readUInt32();

		this.stream.seek(dictionaryKeyTableOffset + 1); // * Skip the type byte
		this.dictionaryKeyTable = this.readStringTableNode();

		this.stream.seek(stringTableOffset + 1); // * Skip the type byte
		this.stringTable = this.readStringTableNode();

		if (binaryDataTableOffset) {
			this.stream.seek(binaryDataTableOffset + 1); // * Skip the type byte
			this.binaryDataTable = this.readBinaryTableNode();
			this.useBinaryTable = true;
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

		this.stream.alignBlock(4); // * Types table is padded to a multiple of 4 using null bytes

		const elements: Node[] = [];

		for (const nodeType of typeTable) {
			let node: PartialNode = {
				type: nodeType
			};

			switch (node.type) {
				case NodeTypes.STRING:
					node.value = this.stringTable.value[this.stream.readUInt32()];
					break;
				case NodeTypes.ARRAY:
				case NodeTypes.DICTIONARY:
				case NodeTypes.STRING_TABLE:
				case NodeTypes.BINARY_TABLE:
				case NodeTypes.INT64:
				case NodeTypes.UINT64:
				case NodeTypes.DOUBLE:
					const offset = this.stream.readUInt32();
					const before = this.stream.tell();
					this.stream.seek(offset);
					node = this.readNode();
					this.stream.seek(before);
					break;
				case NodeTypes.BINARY_DATA:
					const offsetOrIndex = this.stream.readUInt32();
					if (this.binaryDataTable.value.length !== 0) {
						node.value = this.binaryDataTable.value[offsetOrIndex];
					} else {
						const before = this.stream.tell();
						this.stream.seek(offsetOrIndex);
						node = this.readBinaryDataNode();
						this.stream.seek(before);
					}
					break;
				case NodeTypes.BOOL:
					node.value = !!this.stream.readUInt32();
					break;
				case NodeTypes.INT32:
					node.value = this.stream.readInt32();
					break;
				case NodeTypes.FLOAT:
					node.value = this.stream.readFloat();
					break;
				case NodeTypes.UINT32:
					node.value = this.stream.readUInt32();
					break;
				case NodeTypes.NULL:
					node.value = null;
					this.stream.skip(4);
					break;
				default:
					throw new Error('Unhandled array type ' + node.type);
			}

			elements.push(node as Node);
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
			const key = this.dictionaryKeyTable.value[keyIndex];
			let node: PartialNode = {
				type: nodeType
			};

			switch (node.type) {
				case NodeTypes.STRING:
					node.value = this.stringTable.value[this.stream.readUInt32()];
					break;
				case NodeTypes.ARRAY:
				case NodeTypes.DICTIONARY:
				case NodeTypes.STRING_TABLE:
				case NodeTypes.BINARY_TABLE:
				case NodeTypes.INT64:
				case NodeTypes.UINT64:
				case NodeTypes.DOUBLE:
					const offset = this.stream.readUInt32();
					const before = this.stream.tell();
					this.stream.seek(offset);
					node = this.readNode();
					this.stream.seek(before);
					break;
				case NodeTypes.BINARY_DATA:
					const offsetOrIndex = this.stream.readUInt32();
					if (this.binaryDataTable.value.length !== 0) {
						node.value = this.binaryDataTable.value[offsetOrIndex];
					} else {
						const before = this.stream.tell();
						this.stream.seek(offsetOrIndex);
						node = this.readBinaryDataNode();
						this.stream.seek(before);
					}
					break;
				case NodeTypes.BOOL:
					node.value = !!this.stream.readUInt32();
					break;
				case NodeTypes.INT32:
					node.value = this.stream.readInt32();
					break;
				case NodeTypes.FLOAT:
					node.value = this.stream.readFloat();
					break;
				case NodeTypes.UINT32:
					node.value = this.stream.readUInt32();
					break;
				case NodeTypes.NULL:
					node.value = null;
					this.stream.skip(4);
					break;
				default:
					throw new Error('Unhandled dictionary type ' + node.type);
			}

			map[key] = node as Node;
		}

		return {
			type: NodeTypes.DICTIONARY,
			value: map
		};
	}

	private readStringTableNode(): StringTableNode {
		const count = this.stream.readUInt24() + 1;
		const offsetStart = this.stream.tell() - 4; // * Addresses are relative to the start of the node

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
		const count = this.stream.readUInt24() + 1;
		const offsetStart = this.stream.tell() - 4; // * Addresses are relative to the start of the node

		const addressTable: number[] = [];

		for (let i = 0; i < count; i++) {
			const offset = this.stream.readUInt32();
			const address = offsetStart + offset;

			addressTable.push(address);
		}

		const blobs: Buffer[] = [];

		// * -1 because the last address is the end of the table
		for (let i = 0; i < addressTable.length - 1; i++) {
			this.stream.seek(addressTable[i]);

			const size = addressTable[i + 1] - addressTable[i];
			const blob = this.stream.readBytes(size);

			blobs.push(blob);
		}

		return {
			type: NodeTypes.BINARY_TABLE,
			value: blobs
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

	public encode(settings?: BYAMLEncodeSettings): Buffer {
		if (!settings) {
			settings = {
				version: this.version,
				endianness: this.endianness,
				useBinaryTable: this.useBinaryTable,
				rootNode: this.rootNode
			};
		}

		if (settings.version === undefined) {
			if (this.version === undefined) {
				throw new Error('Failed to encode BYAML file. Missing version');
			}

			settings.version = this.version;
		}

		if (settings.useBinaryTable === undefined) {
			settings.useBinaryTable = this.useBinaryTable;
		}

		if (settings.endianness === undefined) {
			if (this.endianness === undefined) {
				throw new Error('Failed to encode BYAML file. Missing endianness');
			}

			settings.endianness = this.endianness;
		}

		if (settings.rootNode === undefined) {
			if (this.rootNode === undefined) {
				throw new Error('Failed to encode BYAML file. Missing root node');
			}

			settings.rootNode = this.rootNode;
		}

		// * Reset back to empty in case the same instance is reused
		this.dictionaryKeyTable.value = [];
		this.stringTable.value = [];
		this.binaryDataTable.value = [];

		this.populateTables(settings.rootNode);

		this.streamOut = new StreamOut();
		this.streamOut.bom = settings.endianness;

		this.streamOut.writeBytes(settings.endianness === 'le' ? MAGIC_LE : MAGIC_BE);
		this.streamOut.writeUint16(settings.version);

		let dictionaryKeyTableOffset: StoredOffset | undefined;
		let stringTableOffset: StoredOffset | undefined;
		let binaryDataTableOffset: StoredOffset | undefined;

		if (this.dictionaryKeyTable.value.length !== 0) {
			dictionaryKeyTableOffset = this.streamOut.storeOffset();
		} else {
			this.streamOut.writeUint32(0);
		}

		if (this.stringTable.value.length !== 0) {
			stringTableOffset = this.streamOut.storeOffset();
		} else {
			this.streamOut.writeUint32(0);
		}

		if (settings.useBinaryTable) {
			binaryDataTableOffset = this.streamOut.storeOffset();
		}

		const rootNodeOffset = this.streamOut.storeOffset();

		if (dictionaryKeyTableOffset) {
			this.encodeNode(this.dictionaryKeyTable, dictionaryKeyTableOffset);
		}

		if (stringTableOffset) {
			this.encodeNode(this.stringTable, stringTableOffset);
		}

		if (binaryDataTableOffset) {
			this.encodeNode(this.binaryDataTable, binaryDataTableOffset);
		}

		this.encodeNode(settings.rootNode, rootNodeOffset);

		return this.streamOut.bytes();
	}

	private populateTables(node: Node): void {
		if (node.type === NodeTypes.DICTIONARY) {
			for (const key in node.value) {
				if (!this.dictionaryKeyTable.value.includes(key)) {
					this.dictionaryKeyTable.value.push(key);
				}

				this.populateTables(node.value[key]);
			}
		}

		if (node.type === NodeTypes.STRING && !this.stringTable.value.includes(node.value)) {
			this.stringTable.value.push(node.value);
		}

		if (node.type === NodeTypes.ARRAY) {
			for (const child of node.value) {
				this.populateTables(child);
			}
		}

		// TODO - Does this also get done for BINARY_DATA_WITH_PARAM?
		if (node.type === NodeTypes.BINARY_DATA) {
			this.binaryDataTable.value.push(node.value);
		}
	}

	private encodeNode(node: Node, offset: StoredOffset): void {
		this.streamOut.alignBlock(4);
		offset.write();

		this.streamOut.writeUint8(node.type);

		switch (node.type) {
			case NodeTypes.STRING:
				this.encodeStringNode(node);
				break;
			case NodeTypes.BINARY_DATA:
				this.encodeBinaryDataNode(node);
				break;
			case NodeTypes.BINARY_DATA_WITH_PARAM:
				this.encodeBinaryDataWithParamNode(node);
				break;
			case NodeTypes.ARRAY:
				this.encodeArrayNode(node);
				break;
			case NodeTypes.DICTIONARY:
				this.encodeDictionaryNode(node);
				break;
			case NodeTypes.STRING_TABLE:
				this.encodeStringTableNode(node);
				break;
			case NodeTypes.BINARY_TABLE:
				this.encodeBinaryTableNode(node);
				break;
			case NodeTypes.BOOL:
				this.encodeBoolNode(node);
				break;
			case NodeTypes.INT32:
				this.encodeIntegerNode(node);
				break;
			case NodeTypes.FLOAT:
				this.encodeFloatNode(node);
				break;
			case NodeTypes.UINT32:
				this.encodeUnsignedIntegerNode(node);
				break;
			case NodeTypes.INT64:
				this.encodeInteger64Node(node);
				break;
			case NodeTypes.UINT64:
				this.encodeUnsignedInteger64Node(node);
				break;
			case NodeTypes.DOUBLE:
				this.encodeDoubleNode(node);
				break;
			case NodeTypes.NULL:
				this.encodeNullNode(node);
				break;
		}
	}

	private encodeStringNode(node: StringNode): void {
		this.streamOut.writeUint32(this.stringTable.value.indexOf(node.value));
	}

	private encodeBinaryDataNode(_node: BinaryDataNode): void {
		// TODO - Implement this
		throw new Error('BinaryDataNodes not implemented');
	}

	private encodeBinaryDataWithParamNode(_node: BinaryDataWithParamNode): void {
		// TODO - Implement this
		throw new Error('BinaryDataWithParamNodes not implemented');
	}

	private encodeArrayNode(node: ArrayNode): void {
		const count = node.value.length;

		this.streamOut.writeUint24(count);

		for (const { type } of node.value) {
			this.streamOut.writeUint8(type);
		}

		this.streamOut.alignBlock(4);

		const pendingOffsets: {
			offset: StoredOffset;
			node: Node;
		}[] = [];

		for (const entry of node.value) {
			switch (entry.type) {
				case NodeTypes.STRING:
					this.encodeStringNode(entry);
					break;
				case NodeTypes.ARRAY:
				case NodeTypes.DICTIONARY:
				case NodeTypes.STRING_TABLE:
				case NodeTypes.BINARY_TABLE:
				case NodeTypes.INT64:
				case NodeTypes.UINT64:
				case NodeTypes.DOUBLE:
					pendingOffsets.push({
						offset: this.streamOut.storeOffset(),
						node: entry
					});
					break;
				case NodeTypes.BINARY_DATA:
					if (this.binaryDataTable.value.length !== 0) {
						const index = this.binaryDataTable.value.findIndex(buffer => buffer.equals(entry.value));
						this.streamOut.writeUint32(index);
					} else {
						pendingOffsets.push({
							offset: this.streamOut.storeOffset(),
							node: entry
						});
					}
					break;
				case NodeTypes.BOOL:
					this.encodeBoolNode(entry);
					break;
				case NodeTypes.INT32:
					this.encodeIntegerNode(entry);
					break;
				case NodeTypes.FLOAT:
					this.encodeFloatNode(entry);
					break;
				case NodeTypes.UINT32:
					this.encodeUnsignedIntegerNode(entry);
					break;
				case NodeTypes.NULL:
					this.encodeNullNode(entry);
			}
		}

		for (const pending of pendingOffsets) {
			this.encodeNode(pending.node, pending.offset);
		}
	}

	private encodeDictionaryNode(node: DictionaryNode): void {
		const entries = Object.entries(node.value);
		const count = entries.length;

		this.streamOut.writeUint24(count);

		const pendingOffsets: {
			offset: StoredOffset;
			node: Node;
		}[] = [];

		for (const [key, entry] of entries) {
			const keyIndex = this.dictionaryKeyTable.value.indexOf(key);

			this.streamOut.writeUint24(keyIndex);
			this.streamOut.writeUint8(entry.type);

			switch (entry.type) {
				case NodeTypes.STRING:
					this.encodeStringNode(entry);
					break;
				case NodeTypes.ARRAY:
				case NodeTypes.DICTIONARY:
				case NodeTypes.STRING_TABLE:
				case NodeTypes.BINARY_TABLE:
				case NodeTypes.INT64:
				case NodeTypes.UINT64:
				case NodeTypes.DOUBLE:
					pendingOffsets.push({
						offset: this.streamOut.storeOffset(),
						node: entry
					});
					break;
				case NodeTypes.BINARY_DATA:
					if (this.binaryDataTable.value.length !== 0) {
						const index = this.binaryDataTable.value.findIndex(buffer => buffer.equals(entry.value));
						this.streamOut.writeUint32(index);
					} else {
						pendingOffsets.push({
							offset: this.streamOut.storeOffset(),
							node: entry
						});
					}
					break;
				case NodeTypes.BOOL:
					this.encodeBoolNode(entry);
					break;
				case NodeTypes.INT32:
					this.encodeIntegerNode(entry);
					break;
				case NodeTypes.FLOAT:
					this.encodeFloatNode(entry);
					break;
				case NodeTypes.UINT32:
					this.encodeUnsignedIntegerNode(entry);
					break;
				case NodeTypes.NULL:
					this.encodeNullNode(entry);
			}
		}

		for (const pending of pendingOffsets) {
			this.encodeNode(pending.node, pending.offset);
		}
	}

	private encodeStringTableNode(node: StringTableNode): void {
		node.value.sort();

		const count = node.value.length;

		this.streamOut.writeUint24(count);

		const addressTableSize = (count + 1) * 4;
		const stringAreaStart = 4 + addressTableSize;

		const offsets: number[] = [];
		let cursor = stringAreaStart;

		for (const str of node.value) {
			offsets.push(cursor);
			cursor += str.length + 1;
		}

		offsets.push(cursor); // * Tables always end with a pointer to the end of the table

		for (const offset of offsets) {
			this.streamOut.writeUint32(offset);
		}

		for (const str of node.value) {
			this.streamOut.writeBytes(Buffer.from(str));
			this.streamOut.writeUint8(0);
		}
	}

	private encodeBinaryTableNode(node: BinaryTableNode): void {
		const count = node.value.length;

		this.streamOut.writeUint24(count);

		const addressTableSize = (count + 1) * 4;
		const blobAreaStart = 4 + addressTableSize;

		const offsets: number[] = [];
		let cursor = blobAreaStart;

		for (const str of node.value) {
			offsets.push(cursor);
			cursor += str.length;
		}

		offsets.push(cursor); // * Tables always end with a pointer to the end of the table

		for (const offset of offsets) {
			this.streamOut.writeUint32(offset);
		}

		for (const blob of node.value) {
			this.streamOut.writeBytes(blob);
		}
	}

	private encodeBoolNode(node: BoolNode): void {
		this.streamOut.writeUint32(node.value ? 1 : 0);
	}

	private encodeIntegerNode(node: IntegerNode): void {
		this.streamOut.writeInt32(node.value);
	}

	private encodeFloatNode(node: FloatNode): void {
		this.streamOut.writeFloat(node.value);
	}

	private encodeUnsignedIntegerNode(node: UnsignedIntegerNode): void {
		this.streamOut.writeUint32(node.value);
	}

	private encodeInteger64Node(_node: Integer64Node): void {
		// TODO - Implement this
		throw new Error('Integer64Nodes not implemented');
	}

	private encodeUnsignedInteger64Node(_node: UnsignedInteger64Node): void {
		// TODO - Implement this
		throw new Error('UnsignedInteger64Nodes not implemented');
	}

	private encodeDoubleNode(_node: DoubleNode): void {
		// TODO - Implement this
		throw new Error('DoubleNodes not implemented');
	}

	private encodeNullNode(_node: NullNode): void {
		this.streamOut.writeUint32(0);
	}

	public toJSON(): RootNode {
		return this.rootNode;
	}
}
