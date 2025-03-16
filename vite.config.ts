import { defineConfig, loadEnv } from 'vite';
import solid from 'vite-plugin-solid';
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
		define: {
			PACKAGE_VERSION: JSON.stringify(packageJson.version),
		},
		base,
		build: {
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
		plugins: [solid()],
		css: {
			preprocessorOptions: {
				scss: {
					api: 'modern-compiler',
				},
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
		},
	});
};
