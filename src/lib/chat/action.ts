import * as YAML from 'yaml';

import { MsgPartsParser } from './parser';
import {
	assistantMsg,
	ChatHistory,
	convertChatHistoryForLLM,
	Msg,
	MSG_PART_TYPE_FUNCTION_CALL,
	MsgPart,
} from './structs';
import { fnImpls, getFnTools, normalizeToolName } from './tools';
import { ToolConfigs } from '../config/tool';
import {
	FunctionCallContent,
	LLMError,
	ModelConfig,
	newClientFromConfig,
} from '../llm';
import { FunctionTool } from '../llm/function';
import { logr } from '../logr';

/**
 * Action for chatting with a single additional message.
 * This is used with the below features:
 * - Model fallback
 * - Automatically run tools and feed to the model
 */
export abstract class SingleLLMAction {
	// Configuratinos

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

	/**
	 * Option to enable LLM Model fallback.
	 */
	enableFallback: boolean = false;

	/**
	 * Whether the action is cancelled.
	 * This is used to stop the streaming & ongoing requests.
	 */
	cancelled: boolean = false;

	// Events

	/**
	 * Called when LLM send a status code 2xx, and streaming is started.
	 */
	onStart?: () => void;

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

	/**
	 * Called when the LLM fails.
	 */
	onLLMFallback?: (
		err: Error,
		index: number,
		modelConfig: ModelConfig
	) => boolean;

	// Abstract Methods

	/**
	 * Generate the system prompt for the model.
	 * This is used for the system message.
	 */
	abstract systemPrompt(
		model: ModelConfig,
		tools: FunctionTool[]
	): Promise<string>;

	// Methods

	constructor(
		modelConfigs: ModelConfig[],
		toolConfigs: ToolConfigs,
		history: ChatHistory
	) {
		this.modelConfigs = modelConfigs;
		this.toolConfigs = toolConfigs;
		this.history = history;
	}

	/**
	 * Cancel the action.
	 */
	cancel() {
		this.cancelled = true;
	}

	protected pushUserMessage(parts: MsgPart[], options?: Partial<Msg>) {
		// Push new user message
		this.history.msgPairs.push({
			user: {
				...options,
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
				assistant: assistantMsg(parts),
			};
		} else {
			// Push new assistant message
			this.history.msgPairs.push({
				assistant: assistantMsg(parts),
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
		const sys = await this.systemPrompt(modelConfig, tools);

		// Part parser
		const parser = new MsgPartsParser();

		// History for LLM
		const llmHistory = await convertChatHistoryForLLM(this.history);
		logr.info('[chat/SingleChatAction/generate] Stream Start');
		const result = await llm.chatStream(sys, llmHistory, {
			onStart: () => {
				this.onStart?.();
			},
			onText: (text) => {
				parser.push(text);
				this.onChunk?.(text, ...parser.state());
				return !this.cancelled;
			},
			isCancelled: () => this.cancelled,
		});
		logr.info('[chat/SingleChatAction/generate] Stream End');

		// Finish parser
		const assistantParts = parser.finish();
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
						const a = YAML.parse(fc.args);
						const result =
							await fnImpls[normalizeToolName(fc.name)](a);
						results.set(fc.id, result);
					} catch (e) {
						if (e instanceof YAML.YAMLError) {
							results.set(
								fc.id,
								`Arguments are invalid YAML:\n${e}`
							);
						} else {
							results.set(fc.id, `Tool Error:\n${e}`);
						}
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
				assistant: assistantMsg(updatedParts),
			};
			this.onUpdate?.(this.history.msgPairs.length - 1);
			return await this.run();
		}
	}

	protected async run(): Promise<void> {
		let lastError: LLMError | undefined;
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
				if (e instanceof LLMError) {
					if (lastError === undefined || e.level < lastError.level) {
						lastError = e;
					}
				}
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

		throw lastError ?? new Error('All fallbacks are failed');
	}

	/**
	 * Run the action.
	 * This will change the given history inplace.
	 */
	async runWithUserMessage(
		userParts: MsgPart[],
		options?: Partial<Msg>
	): Promise<void> {
		logr.info('[chat/SingleChatAction/run] ', userParts);

		this.pushUserMessage(userParts, options);

		try {
			await this.run();
		} catch (e) {
			// Remove the last user message
			this.history.msgPairs.pop();

			throw e;
		}
	}
}
