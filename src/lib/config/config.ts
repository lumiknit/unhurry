import { ModelConfig } from '../llm';

export type Color =
	| 'none'
	| 'primary'
	| 'info'
	| 'success'
	| 'warning'
	| 'danger';
export const colors = [
	'none',
	'primary',
	'info',
	'success',
	'warning',
	'danger',
] as const;
export const colorSet = new Set(colors);

export type PromptTagAction = 'insert' | 'replace';
export const promptTagActions = ['insert', 'replace'] as const;

/**
 * Prompt preset tags.
 */
export type PromptTag = {
	/** Label of tag */
	tag: string;

	/** Color of tag */
	color: Color;

	/** How the tag works */
	action: PromptTagAction;

	/** Values */
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
	 * Enable run code
	 */
	enableRunCode: boolean;

	/**
	 * Enable auto send
	 */
	enableAutoSend: boolean;

	/**
	 * When send the typed text to the server automatically
	 */
	autoSendMillis: number;

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
	enableRunCode: true,
	enableAutoSend: false,
	autoSendMillis: 2000,
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
		Object.entries(merged).forEach(([key]) => {
			if (typeof (d as any)[key] === 'undefined') {
				delete merged[key];
			}
		});
		return merged as unknown as UserConfig;
	} catch {
		return defaultConfig();
	}
};
