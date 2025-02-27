import { defineConfig, loadEnv } from 'vite';
import solid from 'vite-plugin-solid';

export default ({ mode }: { mode: string }) => {
	console.log('Mode', mode);
	const env = loadEnv(mode, process.cwd());
	let base = './';
	if (env.VITE_ROOT_PATH) {
		base = env.VITE_ROOT_PATH;
	}

	return defineConfig({
		base,
		plugins: [solid()],
		css: {
			preprocessorOptions: {
				scss: {
					api: 'modern-compiler',
				},
			},
		},
		server: {
			port: 10101,
			proxy: {
				'/api': {
					target: 'http://localhost:10102',
					changeOrigin: true,
				},
			},
		},
	});
};
