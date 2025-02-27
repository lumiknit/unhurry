import { ModelConfig } from '../llm';

export type UserConfig = {
	models: ModelConfig[];
	currentModelIdx: number;

	useJavascript: boolean;
};

export const defaultConfig = (): UserConfig => ({
	models: [],
	currentModelIdx: 0,
	useJavascript: true,
});

export const sanitizeConfig = (config: UserConfig): UserConfig => {
	try {
		const j = JSON.parse(JSON.stringify(config));
		const d = defaultConfig();
		const merged = {
			...d,
			...j,
		};
		// Check types
		Object.entries(d).forEach(([key, val]) => {
			if (typeof merged[key] !== typeof val) {
				merged[key] = val;
			}
		});
		return merged as unknown as UserConfig;
	} catch {
		return defaultConfig();
	}
};
