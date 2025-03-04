import { rootPath } from '../../env';

// src.App.js
if ('serviceWorker' in navigator) {
	console.log('serviceWorker is supported, registering...');
	navigator.serviceWorker
		.register(rootPath + '/sw.js', {
			scope: rootPath,
		})
		.then((registration) => {
			console.log(
				'ServiceWorker registration successful with scope: ',
				registration.active
			);
		})
		.catch((err) => {
			console.error('ServiceWorker registration failed: ', err);
		});
}
