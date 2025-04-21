import { PromptTag } from './prompt_tag';
import { ModelConfig } from '../llm';
import { ToolConfigs } from './tool';

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
	 * If true, Enter = send, Shift/Cmd/Ctrl-Enter = new line
	 * If false, Enter = new line, Shift/Cmd/Ctrl-Enter = send
	 */
	enterKeyToSend: boolean;

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
	 * Font family
	 */
	fontFamily: 'sans-serif' | 'serif';

	/**
	 * Font size
	 */
	fontSize: number;

	/**
	 * Prompt tags
	 */
	promptTags: PromptTag[];

	/**
	 * Tools
	 */
	tools: ToolConfigs;
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
	enterKeyToSend: false,
	fontFamily: 'sans-serif',
	fontSize: 16,
	autoSendMillis: 2000,
	promptTags: [],
	tools: {},
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

		// Font size should be one of the following
		merged.fontSize = Math.max(10, Math.min(merged.fontSize, 24));

		// Font family
		const fontFamilies = new Set(['sans-serif', 'serif']);
		if (!fontFamilies.has(merged.fontFamily)) {
			merged.fontFamily = 'sans-serif';
		}

		return merged as unknown as UserConfig;
	} catch {
		return defaultConfig();
	}
};
