import { invoke } from '@tauri-apps/api/core';

import { FetchResult, IBEService } from './interface';

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
}
