import { systemPrompt } from '@/store/system_prompts';

import { MsgPartsParser } from './parser';
import { ChatHistory, convertChatHistoryForLLM, MsgPart } from './structs';
import { ModelConfig, newClientFromConfig } from '../llm';
import { logr } from '../logr';

/**
 * Action for chatting with a single additional message.
 * This is used with the below features:
 * - Model fallback
 * - Automatically run tools and feed to the model
 */
export class SingleChatAction {
	/**
	 * Model configs.
	 * The first one is the main model,
	 * and the rest are fallback models.
	 */
	modelConfigs: ModelConfig[];

	/**
	 * Chat history.
	 */
	history: ChatHistory;

	/**
	 *
	 */
	cancelled: boolean = false;

	// Events

	/**
	 * Called when LLM sends a chunk of the message.
	 */
	onChunk?: (chunk: string, parts: MsgPart[], rest: string) => void;

	/**
	 * Called when the LLM history is updated.
	 * For example, user/assistant message is pused.
	 * You can assume that the streaming is done.
	 */
	onUpdate?: (index: number) => void;

	onLLMFallback?: (index: number, modelConfig: ModelConfig) => void;

	constructor(modelConfigs: ModelConfig[], history: ChatHistory) {
		this.modelConfigs = modelConfigs;
		this.history = history;
	}

	cancel() {
		this.cancelled = true;
	}

	protected pushUserMessage(parts: MsgPart[]) {
		// Push new user message
		this.history.msgPairs.push({
			user: {
				role: 'user',
				parts,
				timestamp: Date.now(),
			},
		});
		this.onUpdate?.(this.history.msgPairs.length - 1);
	}

	protected pushAssistantMessage(parts: MsgPart[]) {
		// Check last message
		const last = this.history.msgPairs[this.history.msgPairs.length - 1];
		if (!last) {
			// Push new assistant message
			this.history.msgPairs.push({
				assistant: {
					role: 'assistant',
					parts,
					timestamp: Date.now(),
				},
			});
		} else {
			this.history.msgPairs[this.history.msgPairs.length - 1] = {
				...last,
				assistant: {
					role: 'assistant',
					timestamp: Date.now(),
					parts: [...(last.assistant?.parts || []), ...parts],
				},
			};
		}
		this.onUpdate?.(this.history.msgPairs.length - 1);
	}

	/**
	 * From the current history, generate the next message.
	 */
	protected async generate(modelConfig: ModelConfig) {
		const llm = newClientFromConfig(modelConfig);
		const sys = await systemPrompt(modelConfig.systemPrompt);

		// Part parser
		const parser = new MsgPartsParser();

		// History for LLM
		const llmHistory = convertChatHistoryForLLM(this.history);
		logr.info('[chat/SingleChatAction/generate] Stream Start');
		await llm.chatStream(sys, llmHistory, (chunk, acc) => {
			this.onChunk?.(chunk, ...parser.state());
			parser.push(chunk);
			return !this.cancelled;
		});
		logr.info('[chat/SingleChatAction/generate] Stream End');

		// Finish parser
		const assistantParts = parser.finish();
		this.pushAssistantMessage(assistantParts);

		if (this.cancelled) {
			return;
		}

		const userParts: MsgPart[] = [];
		if (userParts.length > 0) {
			return await this.run(userParts);
		}
	}

	/**
	 * Run the action.
	 * This will change the given history inplace.
	 */
	async run(userParts: MsgPart[]): Promise<void> {
		logr.info('[chat/SingleChatAction/run] ', userParts);

		this.pushUserMessage(userParts);
		for (let idx = 0; idx < this.modelConfigs.length; idx++) {
			if (this.cancelled) {
				logr.info('[chat/SingleChatAction/run] Cancelled');
				return;
			}
			const mc = this.modelConfigs[idx];
			try {
				await this.generate(mc);
				return;
			} catch (e) {
				logr.warn(
					`[chat/SingleChatAction/run] Failed to chat completion with model '${mc.name}', use fallback`,
					e
				);
				this.onLLMFallback?.(idx, mc);
			}
		}

		// All fallbacks are failed
		logr.error('[chat/SingleChatAction/run] All fallbacks are failed');

		// Remove the last user message
		this.history.msgPairs.pop();

		throw new Error('All fallbacks are failed');
	}
}
