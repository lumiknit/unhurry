import { rootPath } from '../../env';
import { logr } from '../logr';

// src.App.js
if ('serviceWorker' in navigator && !(window as any).__TAURI_INTERNALS__) {
	logr.info('[service-worker] is supported, registering...');
	navigator.serviceWorker
		.register(rootPath + '/sw.js', {
			scope: rootPath,
		})
		.then((registration) => {
			logr.info(
				`[service-worker] SW registration successful with scope: ${registration.active}`
			);
		})
		.catch((err) => {
			logr.error(`[service-worker] SW registration failed: ${err}`);
		});
}
