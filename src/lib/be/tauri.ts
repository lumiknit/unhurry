import { invoke } from '@tauri-apps/api/core';
import {
	vibrate,
	impactFeedback,
	notificationFeedback,
} from '@tauri-apps/plugin-haptics';

import {
	FetchResult,
	IBEService,
	ImpactVibePattern,
	impactVibes,
	NotiVibePattern,
	notiVibes,
	VibrationPattern,
} from './interface';

/**
 * Use Tauri (Rust code) as backend service.
 */
export class TauriService implements IBEService {
	constructor() {}

	name(): string {
		return 'Tauri';
	}

	async greet(name: string): Promise<string> {
		return invoke('greet', {
			name,
		});
	}

	async fetch(
		method: string,
		url: string,
		headers?: [string, string][],
		body?: string
	): Promise<FetchResult> {
		const result = await invoke('fetch_http', {
			method,
			url,
			headers,
			body,
		});
		return result as FetchResult;
	}

	async vibrate(pattern: VibrationPattern): Promise<void> {
		if (typeof pattern === 'number') {
			vibrate(pattern);
		} else if (notiVibes.has(pattern)) {
			notificationFeedback(pattern as NotiVibePattern);
		} else if (impactVibes.has(pattern)) {
			impactFeedback(pattern as ImpactVibePattern);
		}
	}
}
