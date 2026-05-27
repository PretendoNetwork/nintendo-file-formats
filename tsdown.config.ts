import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: [
		'./src/byaml.ts',
		'./src/certificate.ts',
		'./src/cia.ts',
		'./src/compression/cmp.ts',
		'./src/compression/index.ts',
		'./src/compression/yaz0.ts',
		'./src/file-stream.ts',
		'./src/index.ts',
		'./src/me01.ts',
		'./src/msbt.ts',
		'./src/signatures.ts',
		'./src/smdh.ts',
		'./src/stored-offset.ts',
		'./src/stream-out.ts',
		'./src/stream.ts',
		'./src/ticket.ts',
		'./src/tmd.ts'
	],
	format: ['esm', 'cjs'],
	dts: true,
	clean: true,
	shims: true,
	sourcemap: true
});
