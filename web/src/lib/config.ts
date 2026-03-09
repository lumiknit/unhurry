// Color type used by ItemList and related UI components
export type Color =
	| 'primary'
	| 'link'
	| 'info'
	| 'success'
	| 'warning'
	| 'danger'
	| 'white'
	| 'black'
	| 'light'
	| 'dark'
	| 'none';

export const colors: Color[] = [
	'primary',
	'link',
	'info',
	'success',
	'warning',
	'danger',
	'white',
	'black',
	'light',
	'dark',
];

// Provider kind - maps to Vercel AI SDK providers
export type ProviderKind =
	| 'openai'
	| 'anthropic'
	| 'google'
	| 'xai'
	| 'mistral'
	| 'groq'
	| 'openrouter'
	| 'ollama';

export const providerKinds: ProviderKind[] = [
	'openai',
	'anthropic',
	'google',
	'xai',
	'mistral',
	'groq',
	'openrouter',
	'ollama',
];

export const providerKindLabel = (kind: ProviderKind): string => {
	const labels: Record<ProviderKind, string> = {
		openai: 'OpenAI',
		anthropic: 'Anthropic',
		google: 'Google',
		xai: 'xAI',
		mistral: 'Mistral',
		groq: 'Groq',
		openrouter: 'OpenRouter',
		ollama: 'Ollama',
	};
	return labels[kind];
};

export interface ProviderConfig {
	id: string;
	name: string;
	kind: ProviderKind;
	baseURL?: string;
	apiKey?: string;
	headers?: Record<string, string>;
	/** Anthropic only: distinguish apiKey vs authToken */
	apiKeyType?: 'apiKey' | 'authToken';
}

export const defaultProviderConfig = (kind: ProviderKind): ProviderConfig => ({
	id: crypto.randomUUID(),
	name: providerKindLabel(kind),
	kind,
});

export type ToolCallStyle = 'builtin' | 'gemma';

export interface ModelConfig {
	id: string;
	/** Display name (optional, defaults to providerId/model) */
	name?: string;
	providerId: string;
	model: string;
	systemPrompt?: string;
	contextLength?: number;
	maxOutputTokens?: number;
	thinkOpen?: string;
	thinkClose?: string;
	toolCallStyle?: ToolCallStyle;
}

export const defaultModelConfig = (): ModelConfig => ({
	id: crypto.randomUUID(),
	providerId: '',
	model: '',
});

export interface UserConfig {
	// Chat
	blurOnSendButton: boolean;
	enableTools: boolean;
	enableLLMFallback: boolean;
	// UI
	enableVibration: boolean;
	fontFamily: string;
	// Providers
	providers: ProviderConfig[];
	// Models (order matters for fallback)
	models: ModelConfig[];
	currentModelIdx: number;
	// Tools
	tools: Record<string, { disabled?: boolean }>;
}

export const defaultUserConfig = (): UserConfig => ({
	blurOnSendButton: false,
	enableTools: false,
	enableLLMFallback: true,
	enableVibration: false,
	fontFamily: 'sans-serif',
	providers: [],
	models: [],
	currentModelIdx: 0,
	tools: {},
});
