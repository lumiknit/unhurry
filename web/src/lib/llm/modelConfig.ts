import type {
	ModelConfig,
	ProviderConfig,
	ProviderKind,
	ToolCallStyle,
} from '../config';

export type { ToolCallStyle };

export interface ProviderPreset {
	defaultBaseURL?: string;
	apiKeyURL?: string;
}

export const providerPresets: Record<ProviderKind, ProviderPreset> = {
	openai: {
		apiKeyURL: 'https://platform.openai.com/api-keys',
	},
	anthropic: {
		apiKeyURL: 'https://console.anthropic.com/settings/keys',
	},
	google: {
		apiKeyURL: 'https://aistudio.google.com/apikey',
	},
	xai: {
		defaultBaseURL: 'https://api.x.ai/v1',
		apiKeyURL: 'https://console.x.ai/',
	},
	mistral: {
		defaultBaseURL: 'https://api.mistral.ai/v1',
		apiKeyURL: 'https://console.mistral.ai/api-keys',
	},
	groq: {
		defaultBaseURL: 'https://api.groq.com/openai/v1',
		apiKeyURL: 'https://console.groq.com/keys',
	},
	openrouter: {
		defaultBaseURL: 'https://openrouter.ai/api/v1',
		apiKeyURL: 'https://openrouter.ai/settings/keys',
	},
	ollama: {
		defaultBaseURL: 'http://localhost:11434/v1',
	},
};

/**
 * Well-known model opts by model name prefix.
 * Returns partial ModelConfig fields to auto-fill on model selection.
 */
const wellKnownModelInfo: [string[], Partial<ModelConfig>][] = [
	// OpenAI
	[
		['o4', 'o3', 'o2', 'o1'],
		{
			contextLength: 200000,
			maxOutputTokens: 100000,
			toolCallStyle: 'builtin',
		},
	],
	[
		['gpt-4.1'],
		{
			contextLength: 1047576,
			maxOutputTokens: 32768,
			toolCallStyle: 'builtin',
		},
	],
	[
		['gpt-4o'],
		{
			contextLength: 128000,
			maxOutputTokens: 16384,
			toolCallStyle: 'builtin',
		},
	],
	// Google
	[
		['gemini-2.5'],
		{
			contextLength: 1048576,
			maxOutputTokens: 65536,
			toolCallStyle: 'builtin',
		},
	],
	[
		['gemini-2.0', 'gemini-1.5'],
		{
			contextLength: 1048576,
			maxOutputTokens: 8192,
			toolCallStyle: 'builtin',
		},
	],
	[
		['gemma3'],
		{
			contextLength: 128000,
			maxOutputTokens: 8192,
			toolCallStyle: 'gemma',
		},
	],
	// Meta
	[
		['llama4-scout'],
		{
			contextLength: 1048576,
			maxOutputTokens: 8192,
			toolCallStyle: 'builtin',
		},
	],
	[['llama-3.3'], { contextLength: 128000, toolCallStyle: 'builtin' }],
	// DeepSeek
	[['deepseek-r1'], { contextLength: 128000, toolCallStyle: 'builtin' }],
	// Mixtral
	[['mixtral'], { contextLength: 32768, toolCallStyle: 'builtin' }],
	// Qwen
	[
		['qwen3'],
		{
			contextLength: 32768,
			thinkOpen: '<think>',
			thinkClose: '</think>',
			toolCallStyle: 'builtin',
		},
	],
	[
		['qwen2.5'],
		{
			contextLength: 1000000,
			thinkOpen: '<think>',
			thinkClose: '</think>',
			toolCallStyle: 'builtin',
		},
	],
	// MS
	[['phi4'], { contextLength: 16384, toolCallStyle: 'builtin' }],
];

export const getWellKnownModelOpts = (
	model: string
): Partial<ModelConfig> | undefined => {
	for (const [prefixes, opts] of wellKnownModelInfo) {
		if (prefixes.some((prefix) => model.startsWith(prefix))) {
			return opts;
		}
	}
	return undefined;
};

export interface Model {
	id: string;
}

export interface LLMClient {
	listModels: () => Promise<Model[]>;
}

export const newClientFromConfig = (_config: ProviderConfig): LLMClient => {
	return {
		listModels: async (): Promise<Model[]> => {
			// TODO: implement per-provider model listing
			return [];
		},
	};
};
