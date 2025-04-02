/**
 * LLM Client Type
 */
export type LLMClientType = 'OpenAI' | 'Anthropic' | 'Gemini';

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

/**
 * Model configuration.
 * This is used for user config.
 */
export interface ModelConfig {
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

	/** Tool Call is supported */
	useToolCall?: boolean;
}

/**
 * Create an empty model config.
 */
export const emptyModelConfig = (): ModelConfig => ({
	name: 'New Model',
	clientType: 'OpenAI',
	endpoint: '',
	apiKey: '',
	model: '',
	systemPrompt: '',
	useToolCall: true,
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
