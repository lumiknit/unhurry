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
	 * Fetch a URL.
	 */
	fetch(
		method: string,
		url: string,
		headers?: [string, string][],
		body?: string
	): Promise<FetchResult>;

	/**
	 * Vibrate
	 */
	vibrate(pattern: VibrationPattern): void;

	// Speech Recognition

	speechRecognizer(): Promise<ISpeechRecognizer>;
}
