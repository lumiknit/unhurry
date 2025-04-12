import { rootPath } from '../../env';
import { logr } from '../logr';

// src.App.js
const useSW = false;
if (
	useSW &&
	'serviceWorker' in navigator &&
	!(window as {__TAURI_INTERNALS__?: undefined}).__TAURI_INTERNALS__
) {
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
