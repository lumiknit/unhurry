import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
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
import { BrowserSpeechRecognizer, ISpeechRecognizer } from './interface_sr';
import { getMimeTypeFromFileName } from '../artifact/mime';
import { UploadedArtifact } from '../artifact/structs';

type WithError = {
	error?: string;
};

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

	// File drag & drop

	unlistens: (() => void)[] = [];

	async mountDragAndDrop(
		onDrop: (artifacts: UploadedArtifact[]) => void
	): Promise<void> {
		type DragAndDropType = {
			paths: string[];
			position: {
				x: number;
				y: number;
			};
		};
		this.unlistens.push(
			await listen<DragAndDropType>(
				'tauri://drag-drop',
				async (event) => {
					// Convert paths to File objects
					const artifacts = await Promise.all(
						event.payload.paths.map(async (path) => {
							const data = await readFile(path);
							const lastSliceIdx = Math.max(
								path.lastIndexOf('\\'),
								path.lastIndexOf('/')
							);
							const name =
								lastSliceIdx >= 0
									? path.slice(lastSliceIdx + 1)
									: path;
							const mimeType = getMimeTypeFromFileName(path);
							return {
								name,
								mimeType,
								data,
							};
						})
					);
					// Call the onDrop callback with the artifacts
					onDrop(artifacts);
				}
			)
		);
	}

	async unmountDragAndDrop(): Promise<void> {
		for (const unlisten of this.unlistens) {
			unlisten();
		}
		this.unlistens = [];
	}

	/**
	 * Download File
	 */
	async downloadFile(name: string, blob: Blob): Promise<void> {
		const filePath = await save({ defaultPath: name });
		if (filePath === null) {
			throw new Error('User canceled the file save dialog');
		}
		const data = new Uint8Array(await blob.arrayBuffer());
		await writeFile(filePath, data);
	}

	async speechRecognizer(): Promise<ISpeechRecognizer> {
		// Check if supported
		const supported = await this.speechRecogSupported();
		if (!supported) {
			console.warn(
				'Speech Recognition Plugin not availble, use fallback'
			);
			return new BrowserSpeechRecognizer();
		}

		// Use Tauri speech recognizer
		return new TauriSpeechRecognizer();
	}

	async speechRecogSupported(): Promise<boolean> {
		const result = await invoke<{
			supported: boolean;
		}>('plugin:speech-recog|is_supported', { payload: {} });
		return result.supported;
	}
}

// Android speech recognition

type SpeechRecogState = {
	recognizing: boolean;
	timestampMs: number;
	completedText: string;
	partialText: string;
	errors: string[];
};

export class TauriSpeechRecognizer implements ISpeechRecognizer {
	recognizing: boolean = false;
	languages: string[] = [];

	onError?: (error: string) => void;
	onTranscript?: (
		transcript: string,
		isFinal: boolean,
		lastTranscript: string
	) => void;
	onStopped?: () => void;

	stateInterval: number = 0;
	lastEventMS: number = 0;
	lastTranscript: string = '';

	async start(): Promise<boolean> {
		if (this.recognizing) {
			return false;
		}

		this.recognizing = true;
		this.lastEventMS = 0;
		this.lastTranscript = '';

		this.stateInterval = window.setInterval(
			() => this.handleGetState(),
			200
		);

		const result = await invoke<
			WithError & {
				success: boolean;
			}
		>('plugin:speech-recog|start_recognition', {
			payload: {
				languages: [],
			},
		});
		if (!result.success) {
			throw new Error(result.error);
		}
		return result.success;
	}

	async stop() {
		const result = await invoke<
			WithError & {
				success: boolean;
			}
		>('plugin:speech-recog|stop_recognition', { payload: {} });
		if (!result.success) {
			throw new Error(result.error);
		}

		this.cleanup();
		return result.success;
	}

	async cleanup() {
		this.recognizing = false;
		window.clearInterval(this.stateInterval);
		this.stateInterval = 0;
	}

	async handleGetState(): Promise<void> {
		const result = await invoke<WithError & SpeechRecogState>(
			'plugin:speech-recog|get_state',
			{ payload: {} }
		);

		if (!result.recognizing) {
			this.onStopped?.();
			this.cleanup();
			return;
		}

		if (result.timestampMs > this.lastEventMS) {
			this.lastEventMS = result.timestampMs;
			const isFinal = result.partialText === '';
			const transcript = result.completedText + result.partialText;
			this.onTranscript?.(transcript, isFinal, this.lastTranscript);
			this.lastTranscript = result.partialText;
		}

		if (result.error) {
			this.onError?.(result.error);
		}
	}
}
