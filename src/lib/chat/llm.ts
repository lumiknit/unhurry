import { systemPrompt } from '@/store/system_prompts';

import { MsgPartsParser } from './parser';
import {
	ChatHistory,
	convertChatHistoryForLLM,
	MSG_PART_TYPE_FUNCTION_CALL,
	MsgPart,
} from './structs';
import { fnImpls, fnTools } from './tools';
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

	enableFallback: boolean = false;

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

	onLLMFallback?: (
		err: Error,
		index: number,
		modelConfig: ModelConfig
	) => boolean;

	constructor(modelConfigs: ModelConfig[], history: ChatHistory) {
		this.modelConfigs = modelConfigs;
		this.history = history;
	}

	setFallback(enable: boolean) {
		this.enableFallback = enable;
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
		if (!last.assistant) {
			this.history.msgPairs[this.history.msgPairs.length - 1] = {
				...last,
				assistant: {
					role: 'assistant',
					timestamp: Date.now(),
					parts: parts,
				},
			};
		} else {
			// Push new assistant message
			this.history.msgPairs.push({
				assistant: {
					role: 'assistant',
					parts,
					timestamp: Date.now(),
				},
			});
		}
		this.onUpdate?.(this.history.msgPairs.length - 1);
	}

	/**
	 * From the current history, generate the next message.
	 */
	protected async generate(modelConfig: ModelConfig) {
		const llm = newClientFromConfig(modelConfig);
		llm.setFunctions(fnTools);
		const sys = await systemPrompt(modelConfig.systemPrompt);

		// Part parser
		const parser = new MsgPartsParser();

		// History for LLM
		const llmHistory = await convertChatHistoryForLLM(this.history);
		console.log('history', llmHistory);
		logr.info('[chat/SingleChatAction/generate] Stream Start');
		const result = await llm.chatStream(sys, llmHistory, {
			onText: (text) => {
				this.onChunk?.(text, ...parser.state());
				parser.push(text);
				return !this.cancelled;
			},
		});
		logr.info('[chat/SingleChatAction/generate] Stream End');

		// Finish parser
		const assistantParts = parser.finish();
		const functionCalls = result.functionCalls();

		this.pushAssistantMessage([
			...assistantParts,
			...functionCalls.map(
				(fc): MsgPart => ({
					type: MSG_PART_TYPE_FUNCTION_CALL,
					content: JSON.stringify(fc),
				})
			),
		]);

		if (this.cancelled) {
			return;
		}

		// Run the function
		if (functionCalls.length > 0) {
			await Promise.all(
				functionCalls.map(async (fc) => {
					try {
						fc.result = await fnImpls[fc.name](JSON.parse(fc.args));
					} catch (e) {
						fc.result = `Error: ${e}`;
					}
				})
			);
			// Update the last message
			this.history.msgPairs[this.history.msgPairs.length - 1] = {
				...this.history.msgPairs[this.history.msgPairs.length - 1],
				assistant: {
					role: 'assistant',
					timestamp: Date.now(),
					parts: [
						...assistantParts,
						...functionCalls.map(
							(fc): MsgPart => ({
								type: MSG_PART_TYPE_FUNCTION_CALL,
								content: JSON.stringify(fc),
							})
						),
					],
				},
			};
			this.onUpdate?.(this.history.msgPairs.length - 1);
			return await this.run();
		}
	}

	protected async run(): Promise<void> {
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
				const err: Error = e instanceof Error ? e : new Error(`${e}`);
				logr.warn(
					`[chat/SingleChatAction/run] Failed to chat completion with model '${mc.name}', use fallback`,
					e
				);
				const v = this.onLLMFallback?.(err, idx, mc);
				if (v === false) {
					logr.info(
						'[chat/SingleChatAction/run] Fallback is disabled'
					);
					break;
				}
			}
		}

		logr.error('[chat/SingleChatAction/run] All fallbacks are failed');

		throw new Error('All fallbacks are failed');
	}

	/**
	 * Run the action.
	 * This will change the given history inplace.
	 */
	async runWithUserMessage(userParts: MsgPart[]): Promise<void> {
		logr.info('[chat/SingleChatAction/run] ', userParts);

		this.pushUserMessage(userParts);

		try {
			await this.run();
		} catch (e) {
			// Remove the last user message
			this.history.msgPairs.pop();

			throw e;
		}
	}
}
