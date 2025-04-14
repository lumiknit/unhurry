import { FetchResult, IBEService, VibrationPattern } from './interface';
import { BrowserSpeechRecognizer, ISpeechRecognizer } from './interface_sr';
import { getMimeTypeFromFileName } from '../artifact/mime';
import { UploadedArtifact } from '../artifact/structs';

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

	private onDrop?: (artifacts: UploadedArtifact[]) => void;

	private onDragOver = (e: DragEvent): void => {
		e.preventDefault();
		e.stopPropagation();
	};

	private onDropFiles = async (e: DragEvent): Promise<void> => {
		e.preventDefault();
		e.stopPropagation();
		if (!this.onDrop) {
			return;
		}
		if (!e.dataTransfer) {
			return;
		}
		const artifacts = await Promise.all(
			Array.from(e.dataTransfer.files).map(async (file) => {
				const lastSliceIdx = Math.max(
					file.name.lastIndexOf('\\'),
					file.name.lastIndexOf('/')
				);
				const name =
					lastSliceIdx >= 0
						? file.name.slice(lastSliceIdx + 1)
						: file.name;
				const mimeType =
					file.type || getMimeTypeFromFileName(file.name);
				const artifact: UploadedArtifact = {
					name,
					mimeType,
					data: new Uint8Array(await file.arrayBuffer()),
				};
				return artifact;
			})
		);
		this.onDrop(artifacts);
	};

	mountDragAndDrop(onDrop: (artifacts: UploadedArtifact[]) => void) {
		this.onDrop = onDrop;
		window.addEventListener('dragover', this.onDragOver);
		window.addEventListener('drop', this.onDropFiles);
	}

	unmountDragAndDrop() {
		window.removeEventListener('dragover', this.onDragOver);
		window.removeEventListener('drop', this.onDropFiles);
		this.onDrop = undefined;
	}

	async speechRecognizer(): Promise<ISpeechRecognizer> {
		return new BrowserSpeechRecognizer();
	}
}
