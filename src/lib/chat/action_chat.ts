import { untrack } from 'solid-js';

import { systemPrompt } from '@/lib/prompts/system_prompts';
import { getMemoryConfig } from '@/store/config';

import { ModelConfig } from '../llm';
import { SingleLLMAction } from './action';
import { FunctionTool } from '../llm/function';

/**
 * Action for chatting with a single additional message.
 * This is used with the below features:
 * - Model fallback
 * - Automatically run tools and feed to the model
 */
export class SingleChatAction extends SingleLLMAction {
	override async systemPrompt(
		model: ModelConfig,
		tools: FunctionTool[]
	): Promise<string> {
		return await systemPrompt(
			model.systemPrompt,
			model.toolCallStyle || 'builtin',
			tools,
			untrack(getMemoryConfig)
		);
	}
}
