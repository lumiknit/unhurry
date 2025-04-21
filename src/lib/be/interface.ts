import { UploadedArtifact } from '@/lib/artifact/structs';

import { ISpeechRecognizer } from './interface_sr';

export interface FetchResult {
	status: number;
	headers: [string, string][];
	body: string;
}

export type NotiVibePattern = 'success' | 'warning' | 'error';
export const notiVibes = new Set<string>(['success', 'warning', 'error']);

export type ImpactVibePattern = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';
export const impactVibes = new Set<string>([
	'light',
	'medium',
	'heavy',
	'soft',
	'rigid',
]);

export type VibrationPattern = number | ImpactVibePattern | NotiVibePattern;

/**
 * Backend service interface.
 * It'll help some actions which are not possible in the browser.
 */
export interface IBEService {
	/**
	 * Backend service name.
	 */
	name(): string;

	/**
	 * Test method.
	 */
	greet(name: string): Promise<string>;

	/**
	 * Fetch
	 */
	rawFetch: typeof window.fetch;

	/**
	 * Fetch a URL.
	 */
	fetch(
		method: string,
		url: string,
		headers?: [string, string][],
		body?: string
	): Promise<FetchResult>;

	/**
	 * Get current device IP.
	 * This only works for desktop tauri mode.
	 */
	myIP(): Promise<string>;

	/**
	 * Generate QR code in svg.
	 * This is only supported for tauri mode
	 */
	genQRSVG(value: string): Promise<string>;

	/**
	 * Scan a QR code
	 */
	scanQRCode(): Promise<string>;

	/**
	 * Vibrate
	 */
	vibrate(pattern: VibrationPattern): void;

	/**
	 * Mount file drag and drop event.
	 */
	mountDragAndDrop(
		onDrop: (artifacts: UploadedArtifact[]) => void
	): void | Promise<void>;

	/**
	 * Download File
	 */
	downloadFile(name: string, blob: Blob): Promise<void>;

	/**
	 * Unmount file drag and drop event.
	 */
	unmountDragAndDrop(): void | Promise<void>;

	// Speech Recognition

	speechRecognizer(): Promise<ISpeechRecognizer>;
}
