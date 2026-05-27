import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import BYAML from '@/byaml';

const SAMPLES_DIR = path.join(__dirname, './samples/byaml');

const samples = fs.readdirSync(SAMPLES_DIR).map(name => ({
	name,
	path: path.join(SAMPLES_DIR, name)
}));

describe('BYAML', () => {
	it.each(samples)('$name', ({ name, path: filePath }) => {
		const original = fs.readFileSync(filePath);
		const byaml = BYAML.fromBuffer(original);
		const originalRoot = byaml.rootNode;
		const encoded = byaml.encode();
		const reDecodedRoot = BYAML.fromBuffer(encoded).rootNode;

		expect(reDecodedRoot, `re-decoded tree does not match original for ${name}`).toEqual(originalRoot);

		if (!encoded.equals(original)) {
			console.warn('the decoded output of the encoded file matches the decoded output of the original file, but the encoded file does not byte-match the original file');
		}
	});
});
