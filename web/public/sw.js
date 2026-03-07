// Service Worker source

console.log('[Service Worker] Loaded');

const openCache = () => caches.open('unhurry');

// Create cache on install
self.addEventListener('install', (e) => {
	console.log('[Service Worker] Installed');
	e.waitUntil(
		(async () => {
			const cache = await openCache();
			console.log('[Service Worker] Cache', 'Opened');
			await cache.addAll([
				'/',
				'/index.html',
				'/apple-touch-icon.png',
				'/favicon.ico',
				'/favicon-96x96.png',
				'/favicon.svg',
				'/icon_mono.svg',
				'/icon.svg',
				'/site.webmanifest',
				'/sw.js',
				'/web-app-manifest-192x192.png',
				'/web-app-manifest-512x512.png',
				'/assets/',
			]);
		})()
	);
});

// Fetch
self.addEventListener('fetch', (e) => {
	console.log('[Service Worker] Fetch', e.request);
	e.respondWith(
		(async () => {
			try {
				const response = await fetch(e.request);
				if (response.ok) {
					const cache = await openCache();
					cache.put(e.request, response.clone());
				}
				return response;
			} catch {
				// Offline, load from cache
				const r = await caches.match(e.request);
				if (r) {
					return r;
				}
				throw new Error('Offline');
			}
		})()
	);
});
