import { invoke } from '@tauri-apps/api/core';

import { FetchResult, ITauriService } from './interface';

export class TauriService implements ITauriService {
	constructor() {}

	async greet(name: string): Promise<string> {
		return invoke('greet', {
			name,
		});
	}

	async fetch(
		method: string,
		url: string,
		headers?: Array<[string, string]>,
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
