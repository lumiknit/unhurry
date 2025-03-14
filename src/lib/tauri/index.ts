import { ITauriService } from './interface';

export * from './interface';

let tauriService: ITauriService | null = null;

export const getTauriService = async (): Promise<ITauriService | void> => {
	if (tauriService) return tauriService;
	if ((window as any).__TAURI_INTERNALS__) {
		const cls = (await import('./service')).TauriService;
		tauriService = new cls();
		return tauriService;
	}
};
