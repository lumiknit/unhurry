import path from 'path';

import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import packageJson from './package.json';

export default () => {
	return defineConfig({
		base: './',
		build: {
			target: ['es2023', 'chrome140', 'safari18'],
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (
							id.includes('/node_modules/marked') ||
							id.includes('/node_modules/marked-katex-extension')
						) {
							return 'marked';
						}
						if (
							id.includes('@codemirror') &&
							!id.includes('legacy-modes') &&
							!id.includes('lang-')
						) {
							return 'codemirror';
						}
					},
				},
			},
		},
		define: {
			PACKAGE_VERSION: JSON.stringify(packageJson.version),
		},
		plugins: [
			devtools({
				autoname: true,
			}),
			solid(),
		],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, 'src'),
				'@components': path.resolve(__dirname, 'src/components'),
				'@lib': path.resolve(__dirname, 'src/lib'),
				'@store': path.resolve(__dirname, 'src/store'),
			},
		},
	});
};
