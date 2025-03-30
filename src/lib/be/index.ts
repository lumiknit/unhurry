import { BrowserService } from './browser';
import { IBEService } from './interface';

export * from './interface_sr';
export * from './interface';

let beService: IBEService | null = null;

/**
 * Get an instance of the backend service.
 * If the backend service is not available, it'll return `undefined`.
 */
export const getBEService = async (): Promise<IBEService> => {
	if (beService) return beService;

	type TauriWindow = typeof window & {
		__TAURI_INTERNALS__?: object;
	};

	if ((window as TauriWindow).__TAURI_INTERNALS__) {
		const cls = (await import('./tauri')).TauriService;
		beService = new cls();
		return beService;
	}

	beService = new BrowserService();
	return beService;
};
