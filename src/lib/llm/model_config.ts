import { uniqueID } from '../utils';

/**
 * LLM Client Type
 */
export type LLMClientType = 'OpenAI' | 'Anthropic' | 'Gemini';

export type ToolCallStyle =
	| 'builtin' // Model's built-in tool call
	| 'gemma'; // Gemma style (md block with tool call)

/**
 * LLM Service Info
 */
export interface LLMServiceInfo {
	/** Service Name */
	name: string;

	/** LLM Client Type */
	clientType: LLMClientType;

	/** Endpoint URL */
	endpoint: string;

	/** API Key Dashboard URL */
	apiKeyURL: string;

	/** Available models */
	models: string[];
}

export interface ModelOpts {
	/** Max token count for the context. */
	contextLength?: number;

	/** Max output tokens. */
	maxOutputTokens?: number;

	/** Think open token in text */
	thinkOpen?: string;

	/** Think close token in text */
	thinkClose?: string;

	/** Tool Call is supported */
	toolCallStyle?: ToolCallStyle;
}

/**
 * Model configuration.
 * This is used for user config.
 */
export type ModelConfig = ModelOpts & {
	/** ModelID */
	id: string;

	/** Display name */
	name: string;

	/** Client type */
	clientType: LLMClientType;

	/** API endpoint */
	endpoint: string;

	/** API key */
	apiKey: string;

	/** Model name */
	model: string;

	/** Additional system prompt */
	systemPrompt: string;
};

/**
 * Create an empty model config.
 */
export const emptyModelConfig = (): ModelConfig => ({
	id: uniqueID(),
	name: 'New Model',
	clientType: 'OpenAI',
	endpoint: '',
	apiKey: '',
	model: '',
	systemPrompt: '',
	toolCallStyle: 'builtin',
});

/**
 * Presets of LLM services.
 * This will be show in model configuration UI.
 */
export const llmPresets: LLMServiceInfo[] = [
	{
		name: 'Ollama',
		clientType: 'OpenAI',
		apiKeyURL: '',
		endpoint: 'http://localhost:11434/v1',
		models: [
			'llama3.3',
			'deepseek-r1',
			'phi4',
			'llama3.1',
			'llama3.2',
			'mistral',
			'qwen2.5',
			'gemma',
		],
	},
	{
		name: 'Gemini',
		clientType: 'Gemini',
		apiKeyURL: 'https://aistudio.google.com/apikey',
		endpoint: 'https://generativelanguage.googleapis.com/v1beta',
		models: [
			'gemini-2.0-flash-lite',
			'gemini-2.0-flash',
			'gemini-1.5-flash',
			'gemini-1.5-flash-8b',
			'gemini-1.5-pro',
		],
	},
	{
		name: 'Groq',
		clientType: 'OpenAI',
		apiKeyURL: 'https://console.groq.com/keys',
		endpoint: 'https://api.groq.com/openai/v1',
		models: [
			'deepseek-r1-distill-llama-70b',
			'deepseek-r1-distill-qwen-32b',
			'qwen-2.5-32b',
			'gemma2-9b-it',
			'llama-3.3-70b-versatile',
		],
	},
	{
		name: 'OpenAI',
		clientType: 'OpenAI',
		apiKeyURL: 'https://platform.openai.com/api-keys',
		endpoint: 'https://api.openai.com/v1',
		models: ['gpt-4o-mini', 'gpt-4o', 'o3', 'o3-mini'],
	},
	{
		name: 'Anthropic',
		clientType: 'Anthropic',
		apiKeyURL: 'https://console.anthropic.com/settings/keys',
		endpoint: 'https://api.anthropic.com/v1',
		models: [
			'claude-3-7-sonnet-latest',
			'claude-3-5-haiku-latest',
			'claude-3-5-sonnet-latest',
			'claude-3-5-opus-latest',
		],
	},

	{
		name: 'OpenRouter',
		clientType: 'OpenAI',
		apiKeyURL: 'https://openrouter.ai/settings/keys',
		endpoint: 'https://openrouter.ai/api/v1',
		models: [
			'deepseek/deepseek-r1:free',
			'meta-llama/llama-3.3-70b-instruct:free',
			'deepseek/deepseek-r1-distill-llama-70b:free',
			'nvidia/llama-3.1-nemotron-70b-instruct:free',
			'qwen/qwen2.5-vl-72b-instruct:free',
			'google/gemma-2-9b-it:free',
		],
	},
	{
		name: 'Mistral',
		clientType: 'OpenAI',
		apiKeyURL: 'https://console.mistral.ai/api-keys',
		endpoint: 'https://api.mistral.ai/v1',
		models: [
			'mistral-large-latest',
			'codestral-latest',
			'pixtral-large-latest',
			'mistral-saba-latest',
			'ministral-8b-latest',
			'ministral-3b-latest',
		],
	},
	{
		name: 'Github',
		clientType: 'OpenAI',
		apiKeyURL: 'https://github.com/settings/tokens',
		endpoint: 'https://models.inference.ai.azure.com',
		models: [
			'gpt-4o-mini',
			'gpt-4o',
			'Phi-3.5-MoE-instruct',
			'Phi-3.5-mini-instruct',
			'Phi-4',
			'Phi-4-mini-instruct',
			'DeepSeek-R1',
			'DeepSeek-V3',
			'Mistral-Nemo',
			'Mistral-large',
			'Mistral-small',
		],
	},
];

/**
 * Well-known model informations.
 * [0] is a prefix of model name, and [1] is the information.
 */
const wellKnownModelInfo: [string[], ModelOpts][] = [
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
	[
		['llama-3.3'],
		{
			contextLength: 128000,
			toolCallStyle: 'builtin',
		},
	],
	// DeepSeek
	[
		['deepseek-r1'],
		{
			contextLength: 128000,
			toolCallStyle: 'builtin',
		},
	],
	// Mixtral
	[
		['mixtral'],
		{
			contextLength: 32768,
			toolCallStyle: 'builtin',
		},
	],
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
	[
		['phi4'],
		{
			contextLength: 16384,
			toolCallStyle: 'builtin',
		},
	],
] as const;

export const getWellKnownModelOpts = (model: string): ModelOpts | undefined => {
	for (const [prefixes, opts] of wellKnownModelInfo) {
		if (prefixes.some((prefix) => model.startsWith(prefix))) {
			return opts;
		}
	}
	return undefined;
};
