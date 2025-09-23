import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/**/*.ts',  '!src/types/**'],
	platform: 'node',
	clean: true,
	dts: false,
	format: ['esm', 'cjs']
});