import { ModelConfig } from '../llm';

/**
 * Prompt preset tags.
 */
export type PromptTag = {
	tag: string;
	prompt: string;
};

/**
 * Configuration for the user
 */
export type UserConfig = {
	/**
	 * LLM Models
	 */
	models: ModelConfig[];
	/**
	 * Current LLM
	 */
	currentModelIdx: number;

	/**
	 * Enable auto send
	 */
	enableAutoSend?: boolean;

	/**
	 * When send the typed text to the server automatically
	 */
	autoSendMillis?: number;

	/**
	 * Use Javascript for the code execution
	 */
	useJavascript: boolean;

	/**
	 * Prompt tags
	 */
	promptTags: PromptTag[];
};

/**
 * Create a default configuration.
 */
export const defaultConfig = (): UserConfig => ({
	models: [],
	currentModelIdx: 0,
	useJavascript: true,
	promptTags: [],
});

/**
 * Sanitize the configuration.
 * If some fields are wrong (e.g. wrong type), it will be replaced with the default value.
 */
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
