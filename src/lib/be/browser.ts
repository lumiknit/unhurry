import { FetchResult, IBEService, VibrationPattern } from './interface';

const vibePatterns = new Map<string, number[]>([
	['light', [10]],
	['medium', [40]],
	['heavy', [100]],
	['soft', [10, 20, 10]],
	['rigid', [40, 20, 40]],
	['success', [30, 20, 30]],
	['warning', [30, 20, 30, 20, 30]],
	['error', [30, 20, 30, 20, 30, 20, 30]],
]);

/**
 * Use Tauri (Rust code) as backend service.
 */
export class BrowserService implements IBEService {
	constructor() {}

	name(): string {
		return 'Browser';
	}

	async greet(name: string): Promise<string> {
		return `Hello, ${name}`;
	}

	async fetch(
		method: string,
		url: string,
		headers?: [string, string][],
		body?: string
	): Promise<FetchResult> {
		try {
			const result = await fetch(url, {
				method,
				headers: new Headers(headers),
				body,
			});
			const respBody = await result.text();
			return {
				status: result.status,
				headers: Array.from(result.headers.entries()),
				body: respBody,
			} as FetchResult;
		} catch (e) {
			return {
				status: 500,
				headers: [],
				body: `Failed to fetch: ${e}`,
			} as FetchResult;
		}
	}

	async vibrate(pattern: VibrationPattern): Promise<void> {
		if (!navigator.vibrate) {
			return;
		}
		if (typeof pattern === 'number') {
			navigator.vibrate(pattern);
		} else {
			const vibes = vibePatterns.get(pattern);
			if (vibes) {
				navigator.vibrate(vibes);
			}
		}
	}
}
