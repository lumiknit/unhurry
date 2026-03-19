import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createOpenAI } from '@ai-sdk/openai';
import { createXai } from '@ai-sdk/xai';
import { streamText } from 'ai';
import type { LanguageModel } from 'ai';

import type { ModelConfig, ProviderConfig } from '@lib/config';
import { convertThreadMessagesToCoreMessages, providerPresets } from '@lib/llm';
import type { ThreadMessage } from '@lib/thread/types';

function createModel(provider: ProviderConfig, modelId: string): LanguageModel {
	const baseURL =
		provider.baseURL || providerPresets[provider.kind]?.defaultBaseURL;
	const apiKey = provider.apiKey || '';

	switch (provider.kind) {
		case 'anthropic':
			return createAnthropic({ apiKey, baseURL })(modelId);
		case 'google':
			return createGoogleGenerativeAI({ apiKey, baseURL })(modelId);
		case 'mistral':
			return createMistral({ apiKey, baseURL })(modelId);
		case 'xai':
			return createXai({ apiKey, baseURL })(modelId);
		default:
			// openai, openrouter, groq, ollama - openai-compatible
			return createOpenAI({ apiKey, baseURL })(modelId);
	}
}

/**
 * Streams LLM response and calls onPartial with accumulated text on each chunk.
 * Returns the final full text.
 */
export async function streamLLMResponse(
	provider: ProviderConfig,
	model: ModelConfig,
	messages: ThreadMessage[],
	onPartial: (accumulated: string) => void
): Promise<string> {
	const llmModel = createModel(provider, model.model);
	const coreMessages = convertThreadMessagesToCoreMessages(messages);

	const result = streamText({
		model: llmModel,
		messages: coreMessages,
		...(model.systemPrompt ? { system: model.systemPrompt } : {}),
		...(model.maxOutputTokens ? { maxTokens: model.maxOutputTokens } : {}),
	});

	let fullText = '';
	for await (const chunk of result.textStream) {
		fullText += chunk;
		onPartial(fullText);
	}
	return fullText;
}
