import { defineConfig } from 'vite';

export default defineConfig({
	build: {
		outDir: 'static',
	},
	base: process.env.NODE_ENV === 'production' ? '/resource/static/' : '/',
});
