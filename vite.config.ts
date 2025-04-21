import path from 'path';

import { defineConfig, loadEnv } from 'vite';
import solid from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import packageJson from './package.json';

const host = process.env.TAURI_DEV_HOST;

export default ({ mode }: { mode: string }) => {
	console.log('Mode', mode);
	const env = loadEnv(mode, process.cwd());
	let base = './';
	if (env.VITE_ROOT_PATH) {
		base = env.VITE_ROOT_PATH;
	}

	return defineConfig({
		base,
		build: {
			target: ['es2023', 'chrome97', 'firefox105', 'safari16'],
			rollupOptions: {
				output: {
					manualChunks: {
						hljs: ['highlight.js'],
						marked: ['marked', 'marked-katex-extension'],
						mermaid: ['mermaid'],
					},
				},
			},
		},
		clearScreen: false,
		css: {
			preprocessorOptions: {
				scss: {
					api: 'modern-compiler',
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
		server: {
			port: 1420,
			strictPort: true,
			host: host || false,
			hmr: host
				? {
						protocol: 'ws',
						host,
						port: 1421,
					}
				: undefined,
			watch: {
				// 3. tell vite to ignore watching `src-tauri`
				ignored: ['**/src-tauri/**'],
			},
			allowedHosts: ['localhost', 'host.docker.internal'],
		},
		preview: {
			port: 1420,
		},
	});
};
