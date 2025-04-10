import { systemPrompt } from '@/lib/prompts/system_prompts';

import { MsgPartsParser } from './parser';
import {
	ChatHistory,
	convertChatHistoryForLLM,
	MSG_PART_TYPE_FUNCTION_CALL,
	MsgPart,
} from './structs';
import { fnImpls, getFnTools } from './tools';
import { ToolConfigs } from '../config/tool';
import { FunctionCallContent, ModelConfig, newClientFromConfig } from '../llm';
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
	 * Tool configs
	 */
	toolConfigs: ToolConfigs;

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

	constructor(
		modelConfigs: ModelConfig[],
		toolConfigs: ToolConfigs,
		history: ChatHistory
	) {
		this.modelConfigs = modelConfigs;
		this.toolConfigs = toolConfigs;
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
			console.log('SET in last');
			this.history.msgPairs[this.history.msgPairs.length - 1] = {
				...last,
				assistant: {
					role: 'assistant',
					timestamp: Date.now(),
					parts: parts,
				},
			};
		} else {
			console.log('PUSH in last');
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
		const tools = getFnTools(this.toolConfigs);
		const llm = newClientFromConfig(modelConfig);
		llm.setFunctions(tools);
		const sys = await systemPrompt(
			modelConfig.systemPrompt,
			!!modelConfig.useToolCall,
			tools
		);

		// Part parser
		const parser = new MsgPartsParser();

		// History for LLM
		const llmHistory = await convertChatHistoryForLLM(this.history);
		console.log('history', sys, llmHistory);
		logr.info('[chat/SingleChatAction/generate] Stream Start');
		const result = await llm.chatStream(sys, llmHistory, {
			onText: (text) => {
				this.onChunk?.(text, ...parser.state());
				parser.push(text);
				return !this.cancelled;
			},
			isCancelled: () => this.cancelled,
		});
		logr.info('[chat/SingleChatAction/generate] Stream End');

		// Finish parser
		const assistantParts = parser.finish();
		console.log('Result', result);
		const functionCalls = result.functionCalls();

		const fullAIParts = [
			...assistantParts,
			...functionCalls.map(
				(fc): MsgPart => ({
					type: MSG_PART_TYPE_FUNCTION_CALL,
					content: JSON.stringify(fc),
				})
			),
		];

		this.pushAssistantMessage(fullAIParts);
		const calls: FunctionCallContent[] = fullAIParts
			.filter((p) => p.type === MSG_PART_TYPE_FUNCTION_CALL)
			.map((p) => {
				const parsed = JSON.parse(p.content);
				return {
					type: 'function_call',
					id: parsed.id,
					name: parsed.name,
					args: parsed.args,
				};
			});

		if (this.cancelled) {
			return;
		}

		// Run the function
		if (calls.length > 0) {
			const results = new Map<string, string>();
			await Promise.all(
				calls.map(async (fc) => {
					try {
						const a = JSON.parse(fc.args);
						const result = await fnImpls[fc.name](a);
						results.set(fc.id, result);
					} catch (e) {
						results.set(fc.id, `Error: ${e}`);
					}
				})
			);

			const updatedParts = fullAIParts.map((p) => {
				if (p.type !== MSG_PART_TYPE_FUNCTION_CALL) return p;
				const parsed = JSON.parse(p.content);
				let result = results.get(parsed.id);
				if (result === undefined) {
					result = '<RESULT DOES NOT EXIST>';
				} else if (result.length === 0) {
					result = '<EMPTY>';
				}
				return {
					type: MSG_PART_TYPE_FUNCTION_CALL,
					content: JSON.stringify({
						...parsed,
						result,
					}),
				};
			});

			// Update the last message
			this.history.msgPairs[this.history.msgPairs.length - 1] = {
				...this.history.msgPairs[this.history.msgPairs.length - 1],
				assistant: {
					role: 'assistant',
					timestamp: Date.now(),
					parts: updatedParts,
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
