import { IBEService, VibrationPattern } from './interface';
import { BrowserSpeechRecognizer, ISpeechRecognizer } from './interface_sr';
import { getMimeTypeFromFileName } from '../artifact/mime';
import { UploadedArtifact } from '../artifact/structs';
import { logr } from '../logr';
import { getFileName } from '../path';

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

	fetch = async (...args: Parameters<typeof fetch>) => {
		return await fetch(...args);
	};

	async myIP(): Promise<string> {
		throw new Error('IP address not supported in browser');
	}

	async genQRSVG(): Promise<string> {
		throw new Error('QR SVG not supported in browser');
	}

	async scanQRCode(): Promise<string> {
		throw new Error('Barcode scanning not supported in browser');
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
				const uri = 'file://' + file.name;
				const name = getFileName(file.name);
				const mimeType =
					file.type || getMimeTypeFromFileName(file.name);
				const artifact: UploadedArtifact = {
					uri,
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

	/**
	 * Upload file
	 */
	async uploadFiles(
		mimeType: string,
		capture?: 'user' | 'environment'
	): Promise<UploadedArtifact[]> {
		const files = await new Promise<File[]>((resolve, reject) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = mimeType;
			if (capture) {
				input.setAttribute('capture', capture);
			}
			input.onchange = (e) => {
				console.log('File selected:', e);
				const files = (e.target as HTMLInputElement).files;
				if (files && files.length > 0) {
					resolve(Array.from(files));
				}
				input.remove();
			};
			input.onerror = (e) => {
				logr.error('Failed to upload file:', e);
				reject(new Error('Failed to upload file: ' + e));
				input.remove();
			};
			input.click();
		});
		const artifacts = await Promise.all(
			files.map(async (file) => {
				const data = await new Promise<Uint8Array>(
					(resolve, reject) => {
						// Read file content as Uint8Array
						const reader = new FileReader();
						reader.onerror = (e) => {
							logr.error('Failed to read file:', e);
							reject(new Error('Failed to read file: ' + e));
						};
						reader.onload = (e) => {
							// Data as Uint8Array
							const data: Uint8Array = new Uint8Array(
								e.target!.result as ArrayBuffer
							);
							resolve(data);
						};
						reader.readAsArrayBuffer(file);
					}
				);
				return {
					uri: 'file://' + file.name,
					name: file.name,
					mimeType: file.type || getMimeTypeFromFileName(file.name),
					data,
				};
			})
		);
		return artifacts;
	}

	/**
	 * Download File
	 */
	async downloadFile(name: string, blob: Blob): Promise<void> {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = name;
		link.click();
		URL.revokeObjectURL(url);
	}

	async speechRecognizer(): Promise<ISpeechRecognizer> {
		return new BrowserSpeechRecognizer();
	}
}
