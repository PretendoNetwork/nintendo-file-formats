import FileStream from '@/file-stream';
import { parseIndexGroup, parseStringTableString } from '@/bfres';
import type { IndexGroup } from '@/bfres/bfres';

const FSKL_MAGIC = Buffer.from('FSKL');

export enum FSKL_SCALING_MODE {
	NONE,
	STANDARD,
	MAYA,
	SOFTIMAGE
}

export enum FSKL_ROTATION_MODE {
	QUATERNION,
	EULER_XYZ
}

export enum FSKL_BONE_BILLBOARD_PROJECTION {
	NONE,
	CHILD,
	WORLD_VIEW_VECTOR,
	WORLD_VIEW_POINT,
	SCREEN_VIEW_VECTOR,
	SCREEN_VIEW_POINT,
	Y_AXIS_VECTOR,
	Y_AXIS_POINT
}

export const FSKL_BONE_TRANSFORM_FLAGS = {
	SEGMENT_SCALE_COMPENSATION: 1,
	SCALE_UNIFORMLY: 2,
	SCALE_VOLUME_BY_1: 4,
	NO_ROTATION: 8,
	NO_TRANSLATION: 16
} as const;

export const FSKL_BONE_HIERARCHY_TRANSFORM_FLAGS = {
	SCALE_UNIFORMLY: 1,
	SCALE_VOLUME_BY_1: 2,
	NO_ROTATION: 4,
	NO_TRANSLATION: 8
} as const;

export type FSKLBone = {
	nameOffset: number;
	name: string;
	boneIndex: number;
	parentIndex: number;
	smoothMatrixIndex: number;
	rigidMatrixIndex: number;
	billboardIndex: number;
	userDataEntryCount: number;
	flagsRaw: number;
	flags: {
		visible: boolean;
		rotationMode: FSKL_ROTATION_MODE;
		billboardProjection: FSKL_BONE_BILLBOARD_PROJECTION;
		transformFlags: number;
		transformHierarchyFlags: number;
	};
	scaleVectors: number[];
	rotationVectors: number[];
	translationVectors: number[];
	userIndexGroupOffsetStart: number;
	userIndexGroupOffset: number;
	userIndexGroup: IndexGroup | null;
};

export default class FSKL {
	private stream: FileStream;

	public boneArrayCount: number;
	public smoothIndexCount: number;
	public rigidIndexCount: number;
	public boneIndexGroupOffset: number;
	public boneArrayOffset: number;
	public smoothIndexArrayOffset: number;
	public smoothMatrixArrayOffset: number;
	public boneIndexGroup: IndexGroup;
	public bones: FSKLBone[] = [];
	public flags: number;
	public scalingMode: FSKL_SCALING_MODE;
	public rotationMode: FSKL_ROTATION_MODE;

	/**
	 * Parses the FSKL from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public parseFromFileStream(stream: FileStream): void {
		this.stream = stream;
		this.parse();
	}

	/**
	 * Creates a new instance of `FSKL` and
	 * parses the FSKL from an existing file stream
	 *
	 * @param stream - An existing file stream
	 */
	public static fromFileStream(stream: FileStream): FSKL {
		const fskl = new FSKL();
		fskl.parseFromFileStream(stream);

		return fskl;
	}

	/**
	 * Parses the FSKL from the input source provided at instantiation
	 */
	public parse(): void {
		this.stream.consumeAll();

		const magic = this.stream.readBytes(0x4);

		if (!FSKL_MAGIC.equals(magic)) {
			throw new Error('Invalid FSKL magic');
		}

		this.flags = this.stream.readUInt32();
		this.boneArrayCount = this.stream.readUInt16();
		this.smoothIndexCount = this.stream.readUInt16();
		this.rigidIndexCount = this.stream.readUInt16();

		this.stream.skip(0x2); // * Padding

		this.boneIndexGroupOffset = this.stream.tell() + this.stream.readUInt32();
		this.boneArrayOffset = this.stream.tell() + this.stream.readUInt32();
		this.smoothIndexArrayOffset = this.stream.tell() + this.stream.readUInt32();
		this.smoothMatrixArrayOffset = this.stream.tell() + this.stream.readUInt32();

		this.stream.skip(0x4); // * User pointer

		this.scalingMode = (this.flags >> 8) & 0x3;
		this.rotationMode = (this.flags >> 12) & 0x1;

		this.stream.seek(this.boneIndexGroupOffset);
		this.boneIndexGroup = parseIndexGroup(this.stream);

		this.parseBoneArray();

		// TODO - Parse smooth index/matrix
		// TODO - Parse rigid index/matrix
	}

	private parseBoneArray(): void {
		this.stream.seek(this.boneArrayOffset);

		for (let i = 0; i < this.boneArrayCount; i++) {
			const nameOffset = this.stream.tell() + this.stream.readInt32();
			const boneIndex = this.stream.readInt16();
			const parentIndex = this.stream.readInt16();
			const smoothMatrixIndex = this.stream.readInt16();
			const rigidMatrixIndex = this.stream.readInt16();
			const billboardIndex = this.stream.readInt16();
			const userDataEntryCount = this.stream.readInt16();
			const flags = this.stream.readUInt32();
			const scaleVectors = Array.from({ length: 3 }, () => this.stream.readFloat());
			const rotationVectors = Array.from({ length: 4 }, () => this.stream.readFloat());
			const translationVectors = Array.from({ length: 3 }, () => this.stream.readFloat());
			const userIndexGroupOffsetStart = this.stream.tell(); // * The offset can be 0, so that needs to be preserved. Start offset can be added later
			const userIndexGroupOffset = this.stream.readInt32();
			const name = parseStringTableString(this.stream, nameOffset);

			this.stream.seek(userIndexGroupOffset);

			this.bones.push({
				nameOffset: nameOffset,
				name: name,
				boneIndex: boneIndex,
				parentIndex: parentIndex,
				smoothMatrixIndex: smoothMatrixIndex,
				rigidMatrixIndex: rigidMatrixIndex,
				billboardIndex: billboardIndex,
				userDataEntryCount: userDataEntryCount,
				flagsRaw: flags,
				flags: {
					visible: !!(flags & 0x1),
					rotationMode: (flags >> 4) & 0x1,
					billboardProjection: (flags >> 8) & 0x7,
					transformFlags: (flags >> 16) & 0xF,
					transformHierarchyFlags: (flags >> 28) & 0xF
				},
				scaleVectors: scaleVectors,
				rotationVectors: rotationVectors,
				translationVectors: translationVectors,
				userIndexGroupOffsetStart: userIndexGroupOffsetStart,
				userIndexGroupOffset: userIndexGroupOffset,
				userIndexGroup: null
			});
		}

		for (const bone of this.bones) {
			if (bone.userIndexGroupOffset !== 0) {
				this.stream.seek(bone.userIndexGroupOffsetStart + bone.userIndexGroupOffset);

				bone.userIndexGroup = parseIndexGroup(this.stream);
			}
		}
	}
}