import { ModelConfig } from '../llm';

/**
 * Display color. Used for the prompt tags.
 */
export type Color =
	| 'none'
	| 'primary'
	| 'info'
	| 'success'
	| 'warning'
	| 'danger';

/**
 * Array of all options for the color.
 */
export const colors = [
	'none',
	'primary',
	'info',
	'success',
	'warning',
	'danger',
] as const;

/**
 * Set of all options for the color.
 */
export const colorSet = new Set(colors);

export type PromptTagAction = 'insert' | 'replace';
export const promptTagActions = ['insert', 'replace'] as const;

/**
 * Prompt preset tags.
 */
export interface PromptTag {
	/** Label of tag */
	tag: string;

	/** Color of tag */
	color: Color;

	/** How the tag works */
	action: PromptTagAction;

	/** Values */
	prompt: string;
}

/**
 * Configuration for the user
 */
export interface UserConfig {
	/**
	 * LLM Models
	 */
	models: ModelConfig[];

	/**
	 * Current LLM
	 */
	currentModelIdx: number;

	/**
	 * LLM Fallback
	 */
	enableLLMFallback: boolean;

	/**
	 * Enable tools
	 */
	enableTools: boolean;

	/**
	 * Enable auto send
	 */
	enableAutoSend: boolean;

	/**
	 * When send the typed text to the server automatically
	 */
	autoSendMillis: number;

	/**
	 * Enable vibration feedback.
	 * This is only available on mobile devices. (Android)
	 */
	enableVibration: boolean;

	/**
	 * Prompt tags
	 */
	promptTags: PromptTag[];
}

/**
 * Create a default configuration.
 */
export const defaultConfig = (): UserConfig => ({
	models: [],
	currentModelIdx: 0,
	enableLLMFallback: true,
	enableTools: true,
	enableAutoSend: false,
	enableVibration: true,
	autoSendMillis: 2000,
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
		Object.entries(merged).forEach(([key]) => {
			if (
				typeof (d as unknown as Record<string, undefined>)[key] ===
				'undefined'
			) {
				delete merged[key];
			}
		});
		return merged as unknown as UserConfig;
	} catch {
		return defaultConfig();
	}
};
