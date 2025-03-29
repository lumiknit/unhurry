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
	SpeechRecogState,
	VibrationPattern,
} from './interface';

type WithError = {
	error?: string;
}

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

	async speechRecogSupported(): Promise<boolean> {
		const result = await invoke<{
			supported: boolean;
		}>('plugin:speech-recog|is_supported', { payload: {}});
		return result.supported;
	}

	async startSpeechRecognition(languages: string[]): Promise<boolean> {
		const result = await invoke<WithError & {
			success: boolean;
		}>('plugin:speech-recog|start_recognition', { payload: {
			languages
		}});
		if (!result.success) {
			throw new Error(result.error);
		}
		return result.success;
	}

	async stopSpeechRecognition(): Promise<boolean> {
		const result = await invoke<WithError & {
			success: boolean;
		}>('plugin:speech-recog|stop_recognition', { payload: {}});
		if (!result.success) {
			throw new Error(result.error);
		}
		return result.success;
	}

	async getSpeechRecognitionState(): Promise<SpeechRecogState> {
		const result = await invoke<WithError & SpeechRecogState>(
			'plugin:speech-recog|get_state',
			{ payload: {}}
		);
		if (result.error) {
			throw new Error(result.error);
		}
		return {
			recognizing: result.recognizing,
			timestampMS: result.timestampMS,
			completedText: result.completedText,
			partialText: result.partialText,
			errors: result.errors,
		};
	}
}
