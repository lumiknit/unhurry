import { GeminiClient } from './client_gemini';
import { ILLMService } from './client_interface';
import { OpenAIClient } from './client_openai';
import { ModelConfig } from './model_config';

/**
 * Create a LLM client based on the config.
 */
export const newClientFromConfig = (config: ModelConfig): ILLMService => {
	switch (config.clientType) {
		case 'OpenAI':
			return new OpenAIClient(config);
		case 'Anthropic':
			throw new Error('Anthropic client not implemented');
		case 'Gemini':
			return new GeminiClient(config);
		default:
			throw new Error('Invalid client type');
	}
};
