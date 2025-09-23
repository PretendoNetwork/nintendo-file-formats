import crypto from 'node:crypto';
import FFLStoreData from '@/mii/ffl-store-data';
import FFLiMiiDataOfficial from '@/mii/ffl-imii-data-official';
import FFLiMiiDataCore from '@/mii/ffl-imii-data-core';

// * Basically just a straight port of https://github.com/PretendoNetwork/mii-js with minor changes

type MiiStudioMiiData = {
	facialHairColor: number;
	beardType: number;
	build: number;
	eyeVerticalStretch: number;
	eyeColor: number;
	eyeRotation: number;
	eyeScale: number;
	eyeType: number;
	eyeSpacing: number;
	eyeYPosition: number;
	eyebrowVerticalStretch: number;
	eyebrowColor: number;
	eyebrowRotation: number;
	eyebrowScale: number;
	eyebrowType: number;
	eyebrowSpacing: number;
	eyebrowYPosition: number;
	skinColor: number;
	makeupType: number;
	faceType: number;
	wrinklesType: number;
	favoriteColor: number;
	gender: number;
	glassesColor: number;
	glassesScale: number;
	glassesType: number;
	glassesYPosition: number;
	hairColor: number;
	flipHair: boolean;
	hairType: number;
	height: number;
	moleScale: number;
	moleType: number;
	moleXPosition: number;
	moleYPosition: number;
	mouthHorizontalStretch: number;
	mouthColor: number;
	mouthScale: number;
	mouthType: number;
	mouthYPosition: number;
	mustacheScale: number;
	mustacheType: number;
	mustacheYPosition: number;
	noseScale: number;
	noseType: number;
	noseYPosition: number;
}

type MiiStudioRenderParams = {
	type?: string;
	expression?: string;
	width?: number;
	bgColor?: string;
	clothesColor?: string;
	cameraXRotate?: number;
	cameraYRotate?: number;
	cameraZRotate?: number;
	characterXRotate?: number;
	characterYRotate?: number;
	characterZRotate?: number;
	lightXDirection?: number;
	lightYDirection?: number;
	lightZDirection?: number;
	lightDirectionMode?: string;
	instanceCount?: number;
	instanceRotationMode?: string;
	splitMode?: string;
	data?: string;
}

const STUDIO_RENDER_URL_BASE = 'https://studio.mii.nintendo.com/miis/image.png';
const STUDIO_ASSET_URL_BASE = 'https://mii-studio.akamaized.net/editor/1';
const STUDIO_ASSET_FILE_TYPE = 'webp';

const STUDIO_RENDER_DEFAULTS = {
	type: 'face',
	expression: 'normal',
	width: 96,
	bgColor: 'FFFFFF00',
	clothesColor: 'default',
	cameraXRotate: 0,
	cameraYRotate: 0,
	cameraZRotate: 0,
	characterXRotate: 0,
	characterYRotate: 0,
	characterZRotate: 0,
	lightXDirection: 0,
	lightYDirection: 0,
	lightZDirection: 0,
	lightDirectionMode: 'none',
	splitMode: 'none',
	instanceCount: 1,
	instanceRotationMode: 'model'
};

const STUDIO_RENDER_TYPES = [
	'face',
	'face_only',
	'all_body'
];

const STUDIO_RENDER_EXPRESSIONS = [
	'normal',
	'smile',
	'anger',
	'sorrow',
	'surprise',
	'blink',
	'normal_open_mouth',
	'smile_open_mouth',
	'anger_open_mouth',
	'surprise_open_mouth',
	'sorrow_open_mouth',
	'blink_open_mouth',
	'wink_left',
	'wink_right',
	'wink_left_open_mouth',
	'wink_right_open_mouth',
	'like_wink_left',
	'like_wink_right',
	'frustrated'
];

const STUDIO_RENDER_CLOTHES_COLORS = [
	'default',
	'red',
	'orange',
	'yellow',
	'yellowgreen',
	'green',
	'blue',
	'skyblue',
	'pink',
	'purple',
	'brown',
	'white',
	'black'
];

const STUDIO_RENDER_LIGHT_DIRECTION_MODES = [
	'none',
	'zerox',
	'flipx',
	'camera',
	'offset',
	'set'
];

const STUDIO_SPLIT_MODES = [
	'none', // * Not actually valid, returns 400
	'front',
	'back',
	'both'
];

const STUDIO_RENDER_INSTANCE_ROTATION_MODES = [
	'model',
	'camera',
	'both'
];

const STUDIO_BG_COLOR_REGEX = /^[0-9A-F]{8}$/; // * Mii Studio does not allow lowercase

export default class MiiStudioEncoder {
	private data?: MiiStudioMiiData;

	constructor(data?: MiiStudioMiiData) {
		if (data) {
			this.data = data;
		}
	}

	public createURLFromFFL(ffl: FFLStoreData | FFLiMiiDataOfficial | FFLiMiiDataCore, renderParams?: MiiStudioRenderParams): string {
		const coreData = ffl instanceof FFLStoreData ? ffl.FFLiMiiDataOfficial.FFLiMiiDataCore : ffl instanceof FFLiMiiDataOfficial ? ffl.FFLiMiiDataCore : ffl;
		const miiStudioData = {
			facialHairColor: coreData.beardColor === 0 ? 8 : coreData.beardColor,
			beardType: coreData.beardType,
			build: coreData.build,
			eyeVerticalStretch: coreData.eyeAspect,
			eyeColor: coreData.eyeColor + 8,
			eyeRotation: coreData.eyeRotate,
			eyeScale: coreData.eyeScale,
			eyeType: coreData.eyeType,
			eyeSpacing: coreData.eyeX,
			eyeYPosition: coreData.eyeY,
			eyebrowVerticalStretch: coreData.eyebrowAspect,
			eyebrowColor: coreData.eyebrowColor === 0 ? 8 : coreData.eyebrowColor,
			eyebrowRotation: coreData.eyebrowRotate,
			eyebrowScale: coreData.eyebrowScale,
			eyebrowType: coreData.eyebrowType,
			eyebrowSpacing: coreData.eyebrowX,
			eyebrowYPosition: coreData.eyebrowY,
			skinColor: coreData.faceColor,
			makeupType: coreData.faceMake,
			faceType: coreData.faceType,
			wrinklesType: coreData.faceTex,
			favoriteColor: coreData.favoriteColor,
			gender: coreData.gender,
			glassesColor: coreData.glassColor === 0 ? 8 : coreData.glassColor < 6 ? coreData.glassColor + 13 : 0,
			glassesScale: coreData.glassScale,
			glassesType: coreData.glassType,
			glassesYPosition: coreData.glassY,
			hairColor: coreData.hairColor === 0 ? 8 : coreData.hairColor,
			flipHair: coreData.hairFlip,
			hairType: coreData.hairType,
			height: coreData.height,
			moleScale: coreData.moleScale,
			moleType: coreData.moleType,
			moleXPosition: coreData.moleX,
			moleYPosition: coreData.moleY,
			mouthHorizontalStretch: coreData.mouthAspect,
			mouthColor: coreData.mouthColor < 4 ? coreData.mouthColor + 19 : 0,
			mouthScale: coreData.mouthScale,
			mouthType: coreData.mouthType,
			mouthYPosition: coreData.mouthY,
			mustacheScale: coreData.beardScale,
			mustacheType: coreData.mustacheType,
			mustacheYPosition: coreData.beardY,
			noseScale: coreData.noseScale,
			noseType: coreData.noseType,
			noseYPosition: coreData.noseY
		};

		return this.createURL({
			...renderParams || STUDIO_RENDER_DEFAULTS,
			data: this.encodeData(miiStudioData).toString('hex')
		});
	}

	public createURL(renderParams: MiiStudioRenderParams): string {
		const params = {
			...STUDIO_RENDER_DEFAULTS,
			...renderParams
		};

		// TODO - Assert and error out instead of setting defaults?

		params.type = STUDIO_RENDER_TYPES.includes(params.type as string) ? params.type : STUDIO_RENDER_DEFAULTS.type;
		params.expression = STUDIO_RENDER_EXPRESSIONS.includes(params.expression as string) ? params.expression : STUDIO_RENDER_DEFAULTS.expression;
		params.width = Math.min(params.width, 512);
		params.bgColor = STUDIO_BG_COLOR_REGEX.test(params.bgColor as string) ? params.bgColor : STUDIO_RENDER_DEFAULTS.bgColor;
		params.clothesColor = STUDIO_RENDER_CLOTHES_COLORS.includes(params.clothesColor) ? params.clothesColor : STUDIO_RENDER_DEFAULTS.clothesColor;
		params.cameraXRotate = Math.min(params.cameraXRotate, 359);
		params.cameraYRotate = Math.min(params.cameraYRotate, 359);
		params.cameraZRotate = Math.min(params.cameraZRotate, 359);
		params.characterXRotate = Math.min(params.characterXRotate, 359);
		params.characterYRotate = Math.min(params.characterYRotate, 359);
		params.characterZRotate = Math.min(params.characterZRotate, 359);
		params.lightXDirection = Math.min(params.lightXDirection, 359);
		params.lightYDirection = Math.min(params.lightYDirection, 359);
		params.lightZDirection = Math.min(params.lightZDirection, 359);
		params.lightDirectionMode = STUDIO_RENDER_LIGHT_DIRECTION_MODES.includes(params.lightDirectionMode) ? params.lightDirectionMode : STUDIO_RENDER_DEFAULTS.lightDirectionMode;
		params.splitMode = STUDIO_SPLIT_MODES.includes(params.splitMode) ? params.splitMode : STUDIO_RENDER_DEFAULTS.splitMode;
		params.instanceCount = Math.min(params.instanceCount, 1, 16);
		params.instanceRotationMode = STUDIO_RENDER_INSTANCE_ROTATION_MODES.includes(params.instanceRotationMode) ? params.instanceRotationMode : STUDIO_RENDER_DEFAULTS.instanceRotationMode;

		// * Converts non-string params to strings
		const query = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([key, value]) => [key, value.toString()])));

		if (params.lightDirectionMode === 'none') {
			query.delete('lightDirectionMode');
			query.delete('lightXDirection');
			query.delete('lightYDirection');
			query.delete('lightZDirection');
		}

		if (params.splitMode === 'none') {
			query.delete('splitMode');
		}

		return `${STUDIO_RENDER_URL_BASE}?${query.toString()}`;
	}

	public studioAssetURLBody(): string {
		if (!this.data) {
			return '';
		}

		return this.studioAssetURL(`body/${this.data.gender}/${this.data.favoriteColor}`);
	}

	public studioAssetURLHead(): string {
		if (!this.data) {
			return '';
		}

		return this.studioAssetURL(
			`face/${this.data.faceType}/${this.data.wrinklesType}/${this.data.makeupType}/${this.data.skinColor}`
		);
	}

	public studioAssetURLFace(): string {
		if (!this.data) {
			return '';
		}

		// * Alias
		return this.studioAssetURLHead();
	}

	public studioAssetURLEye(): string {
		if (!this.data) {
			return '';
		}

		return this.studioAssetURL(`eye/${this.data.eyeType}/${this.data.eyeColor + 8}`);
	}

	public studioAssetURLEyebrow(): string {
		if (!this.data) {
			return '';
		}

		let eyebrowColor = this.data.eyebrowColor;

		if (this.data.eyebrowColor === 0) {
			eyebrowColor = 8;
		}

		return this.studioAssetURL(`eyebrow/${this.data.eyebrowType}/${eyebrowColor}`);
	}

	public studioAssetURLNose(): string {
		if (!this.data) {
			return '';
		}

		return this.studioAssetURL(`nose/${this.data.noseType}/${this.data.skinColor}`);
	}

	public studioAssetURLMouth(): string {
		if (!this.data) {
			return '';
		}

		let mouthColor = 0;

		if (this.data.mouthColor < 4) {
			mouthColor = this.data.mouthColor + 19;
		}

		return this.studioAssetURL(`mouth/${this.data.mouthType}/${mouthColor}`);
	}

	public studioAssetURLHair(): string {
		if (!this.data) {
			return '';
		}

		let assetPath;
		let hairColor = this.data.hairColor;

		if (this.data.hairColor == 0) {
			hairColor = 8;
		}

		if (this.data.hairType === 34 || this.data.hairType === 57) {
			// * Types 34 and 57 are hats
			// * No flip and they use clothes color not hair color
			assetPath = `hair/${this.data.hairType}/${this.data.faceType}/${this.data.favoriteColor}`;
		} else {
			// * Regular hair types
			assetPath = `${this.data.flipHair ? 'hairflip' : 'hair'}/${this.data.hairType}/${this.data.faceType}/${hairColor}`;
		}

		return this.studioAssetURL(assetPath);
	}

	public studioAssetURLBeard(): string {
		if (!this.data) {
			return '';
		}

		let facialHairColor = this.data.facialHairColor;

		if (this.data.facialHairColor === 0) {
			facialHairColor = 8;
		}

		return this.studioAssetURL(`beard/${this.data.beardType}/${this.data.faceType}/${facialHairColor}`);
	}

	public studioAssetURLMustache(): string {
		if (!this.data) {
			return '';
		}

		let facialHairColor = this.data.facialHairColor;

		if (this.data.facialHairColor === 0) {
			facialHairColor = 8;
		}

		return this.studioAssetURL(`mustache/${this.data.mustacheType}/${facialHairColor}`);
	}

	public studioAssetURLGlasses(): string {
		if (!this.data) {
			return '';
		}

		let glassesColor = 0;

		if (this.data.glassesColor == 0) {
			glassesColor = 8;
		} else if (this.data.glassesColor < 6) {
			glassesColor = this.data.glassesColor + 13;
		}

		return this.studioAssetURL(`glass/${this.data.glassesType}/${glassesColor}`);
	}

	public studioAssetURLMole(): string {
		if (!this.data) {
			return '';
		}

		return this.studioAssetURL(`mole/${this.data.moleType}`);
	}

	public studioAssetURL(assetPath: string): string {
		if (!this.data) {
			return '';
		}

		const assetPathHash = crypto.createHash('md5').update(assetPath).digest('hex');
		const char0 = assetPathHash[0];
		const char1 = assetPathHash[1];
		const char2 = assetPathHash[2];
		const fileName = assetPathHash.substring(3, 12);

		return `${STUDIO_ASSET_URL_BASE}/${STUDIO_ASSET_FILE_TYPE}/1024/${char0}/${char1}/${char2}/${fileName}.${STUDIO_ASSET_FILE_TYPE}`;
	}

	private encodeData(data: MiiStudioMiiData): Buffer {
		const miiStudioData = Buffer.alloc(0x2f);
		const randomizer = Math.floor(256 * Math.random());
		let next = randomizer;
		let pos = 1;

		function encodeMiiPart(partValue: number): void {
			const encoded = (7 + (partValue ^ next)) % 256;
			next = encoded;

			miiStudioData.writeUInt8(encoded, pos);
			pos++;
		}

		miiStudioData.writeUInt8(randomizer);

		encodeMiiPart(data.facialHairColor);
		encodeMiiPart(data.beardType);
		encodeMiiPart(data.build);
		encodeMiiPart(data.eyeVerticalStretch);
		encodeMiiPart(data.eyeColor);
		encodeMiiPart(data.eyeRotation);
		encodeMiiPart(data.eyeScale);
		encodeMiiPart(data.eyeType);
		encodeMiiPart(data.eyeSpacing);
		encodeMiiPart(data.eyeYPosition);
		encodeMiiPart(data.eyebrowVerticalStretch);
		encodeMiiPart(data.eyebrowColor);
		encodeMiiPart(data.eyebrowRotation);
		encodeMiiPart(data.eyebrowScale);
		encodeMiiPart(data.eyebrowType);
		encodeMiiPart(data.eyebrowSpacing);
		encodeMiiPart(data.eyebrowYPosition);
		encodeMiiPart(data.skinColor);
		encodeMiiPart(data.makeupType);
		encodeMiiPart(data.faceType);
		encodeMiiPart(data.wrinklesType);
		encodeMiiPart(data.favoriteColor);
		encodeMiiPart(data.gender);
		encodeMiiPart(data.glassesColor);
		encodeMiiPart(data.glassesScale);
		encodeMiiPart(data.glassesType);
		encodeMiiPart(data.glassesYPosition);
		encodeMiiPart(data.hairColor);
		encodeMiiPart(data.flipHair ? 1 : 0);
		encodeMiiPart(data.hairType);
		encodeMiiPart(data.height);
		encodeMiiPart(data.moleScale);
		encodeMiiPart(data.moleType);
		encodeMiiPart(data.moleXPosition);
		encodeMiiPart(data.moleYPosition);
		encodeMiiPart(data.mouthHorizontalStretch);
		encodeMiiPart(data.mouthColor);
		encodeMiiPart(data.mouthScale);
		encodeMiiPart(data.mouthType);
		encodeMiiPart(data.mouthYPosition);
		encodeMiiPart(data.mustacheScale);
		encodeMiiPart(data.mustacheType);
		encodeMiiPart(data.mustacheYPosition);
		encodeMiiPart(data.noseScale);
		encodeMiiPart(data.noseType);
		encodeMiiPart(data.noseYPosition);

		return miiStudioData;
	}
}