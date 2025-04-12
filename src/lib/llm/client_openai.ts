import { ILLMService, Model, StreamCallbacks } from './client_interface';
import {
	BadRequestError,
	RateLimitError,
	RequestEntityTooLargeError,
} from './errors';
import {
	appendPartialFunctionCall,
	FunctionTool,
	PartialFunctionCall,
} from './function';
import { readSSEJSONStream } from './json_stream_reader';
import {
	LLMMessages,
	LLMMessage,
	FunctionCallContent,
	TypedContent,
	LLMMsgContent,
	fnCallMsgPartToMD,
} from './message';
import { ModelConfig } from './model_config';
import { logr } from '../logr';

// OpenAI Message

interface SystemMessage {
	role: 'system';
	content: string | TypedContent[];
}

interface UserMessage {
	role: 'user';
	content: string | TypedContent[];
}

interface ToolCall {
	type: 'function';
	id: string;
	function: {
		name: string;
		arguments: string;
	};
}

interface AssistantMessage {
	role: 'assistant';
	content: string | TypedContent[];
	tool_calls?: ToolCall[];
}

interface ToolMessage {
	role: 'tool';
	tool_call_id: string;
	content: string;
}

type Message = SystemMessage | UserMessage | AssistantMessage | ToolMessage;

// OpenAI API Response

interface ChatToolCall {
	id: string;
	type: 'function';
	function: ChatStreamFunctionCall;
}

interface ChatChoice {
	message: {
		role: string;
		content: string;
		tool_calls?: ChatToolCall[];
	};
}

interface ChatCompletionResponse {
	choices: ChatChoice[];
}

interface ChatStreamFunctionCall {
	name: string;
	arguments: string;
}

interface ChatStreamToolCall {
	index: number;
	id: string | null;
	type: 'function';
	function: ChatStreamFunctionCall;
}

interface ChatStreamDelta {
	role: string;
	content: string | null;
	tool_calls?: ChatStreamToolCall[];
}

interface ChatStreamChoice {
	index: number;
	delta: ChatStreamDelta;
	logprobs: null | number[];
	finish_reason: null | string;
}

interface ChatStreamChunk {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: ChatStreamChoice[];
}

/**
 * OpenAI & OpenAI Compatible LLM Service
 */
export class OpenAIClient implements ILLMService {
	config: ModelConfig;
	functions: FunctionTool[] = [];
	isMistral?: boolean;

	constructor(config: ModelConfig) {
		if (config.clientType !== 'OpenAI') {
			throw new Error('Invalid client type');
		}

		this.config = config;

		if (this.config.endpoint.includes('api.mistral.ai')) {
			this.isMistral = true;
		}
	}

	setFunctions(functions: FunctionTool[]): void {
		this.functions = functions;
	}

	private convertHistory(history: LLMMessages): Message[] {
		const msgs: Message[] = [];
		for (const msg of history) {
			// If message is a string, just push
			if (typeof msg.content === 'string') {
				msgs.push({
					role: msg.role,
					content: msg.content,
				});
				continue;
			}
			// Otherwise, handle each parts.
			const content: TypedContent[] = [];
			const fc: FunctionCallContent[] = [];
			for (const c of msg.content) {
				// Function call should be separated
				switch (c.type) {
					case 'function_call':
						fc.push(c);
						break;
					case 'image_url':
					default:
						content.push(c);
						break;
				}
			}
			let toolCalls: ToolCall[] | undefined;
			const toolCallResult: Message[] = [];
			if (msg.role === 'assistant' && fc.length > 0) {
				if (this.config.useToolCall) {
					toolCalls = fc.map((f) => {
						if (f.result) {
							toolCallResult.push({
								role: 'tool',
								tool_call_id: f.id,
								content: f.result,
							});
						}
						return {
							type: 'function',
							id: f.id,
							function: {
								name: f.name,
								arguments: f.args,
							},
						};
					});
				} else {
					const results: string[] = [];
					// If tool call is not used, just append as text.
					for (const f of fc) {
						const [callMD, resultMD] = fnCallMsgPartToMD(f);
						content.push({
							type: 'text',
							text: callMD,
						});
						results.push(resultMD);
					}

					toolCallResult.push({
						role: 'user',
						content: results.join('\n\n'),
					});
				}
			}
			let c: string | TypedContent[] = content;
			if (content.length === 0) c = '';
			else if (content.every((x) => x.type === 'text'))
				c = content.map((x) => x.text).join('\n\n');
			const m: Message = {
				role: msg.role,
				content: c,
				tool_calls: toolCalls,
			};
			msgs.push(m, ...toolCallResult);
		}
		return msgs;
	}

	private async packChatResponse(
		text: string,
		toolCalls: PartialFunctionCall[]
	): Promise<LLMMessage> {
		if (toolCalls.length === 0) {
			return LLMMessage.assistant(text);
		}
		return LLMMessage.assistant([
			{
				type: 'text',
				text,
			},
			...toolCalls.map(
				(tc): FunctionCallContent => ({
					type: 'function_call',
					id: tc.id,
					name: tc.name,
					args: tc.args,
				})
			),
		]);
	}

	private chatCompletionBody(
		system: string,
		history: LLMMessages,
		stream?: boolean
	): string {
		const fnArgsKey = this.isMistral ? 'parameters' : 'arguments';
		const strict = this.isMistral ? undefined : true;
		const tools = this.functions.map((f) => ({
			type: 'function',
			function: {
				name: f.name,
				[fnArgsKey]: f.parameters,
			},
			strict,
		}));
		return JSON.stringify({
			model: this.config.model,
			messages: [
				{
					role: 'system',
					content: system,
				},
				...this.convertHistory(history),
			],
			tools:
				this.config.useToolCall && tools.length > 0 ? tools : undefined,
			stream: stream,
		});
	}

	async chat(
		systemPrompt: string,
		history: LLMMessages
	): Promise<LLMMessage> {
		const url = `${this.config.endpoint}/chat/completions`;

		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${this.config.apiKey}`,
			Accept: 'application/json',
		};

		const resp = await fetch(url, {
			method: 'POST',
			headers,
			body: this.chatCompletionBody(systemPrompt, history),
		});
		if (!resp.ok) {
			const body = await resp.text();
			switch (resp.status) {
				case 400:
					throw new BadRequestError(body);
				case 413:
					throw new RequestEntityTooLargeError(body);
				case 429:
					throw new RateLimitError(body);
			}
			throw new Error(
				`Failed to chat stream: ${resp.status} ${resp.statusText}\n${body}`
			);
		}
		const respBody = (await resp.json()) as ChatCompletionResponse;
		const choiceZero = respBody.choices[0];
		const textContent = choiceZero.message.content;
		const toolCalls: PartialFunctionCall[] = (
			choiceZero.message.tool_calls || []
		).map((tc) => ({
			id: tc.id || '',
			name: tc.function.name,
			args: tc.function.arguments,
		}));
		return this.packChatResponse(textContent, toolCalls);
	}

	async chatStream(
		systemPrompt: string,
		history: LLMMessages,
		callbacks: StreamCallbacks
	): Promise<LLMMessage> {
		const url = `${this.config.endpoint}/chat/completions`;
		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${this.config.apiKey}`,
		};
		// Use SSE
		const resp = await fetch(url, {
			method: 'POST',
			headers,
			body: this.chatCompletionBody(systemPrompt, history, true),
		});
		if (!resp.ok) {
			const body = await resp.text();
			switch (resp.status) {
				case 400:
					throw new BadRequestError(body);
				case 413:
					throw new RequestEntityTooLargeError(body);
				case 429:
					throw new RateLimitError(body);
			}
			throw new Error(
				`Failed to chat stream: ${resp.status} ${resp.statusText}\n${body}`
			);
		}
		const reader = resp.body?.getReader();
		if (!reader) {
			throw new Error('Failed to get response reader');
		}

		let content: LLMMsgContent = '';
		const toolCalls: PartialFunctionCall[] = [];

		await readSSEJSONStream<ChatStreamChunk>(reader, (chunk) => {
			if (!chunk.choices || chunk.choices.length === 0) {
				logr.warn('No choices in chunk', JSON.stringify(chunk));
				return;
			}
			const delta = chunk.choices[0].delta;
			if (delta.content) {
				content += delta.content;
				callbacks.onText?.(delta.content);
			}
			if (delta.tool_calls) {
				for (const tc of delta.tool_calls) {
					toolCalls[tc.index] = appendPartialFunctionCall(
						toolCalls[tc.index],
						{
							id: tc.id || '',
							name: tc.function.name || '',
							args: tc.function.arguments || '',
						}
					);
					callbacks.onFunctionCall?.(
						tc.index,
						tc.id,
						tc.function.name,
						tc.function.arguments
					);
				}
			}
			if (callbacks.isCancelled?.()) {
				reader.cancel();
				logr.info('[chat/SingleChatAction/generate] Stream Cancelled');
			}
		});

		return this.packChatResponse(content, toolCalls);
	}

	async listModels(): Promise<Model[]> {
		interface ModelRespItem {
			id: string;
			object: string;
			owned_by: string;
			created: number;
		}
		const url = `${this.config.endpoint}/models`;
		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${this.config.apiKey}`,
		};
		const resp = await fetch(url, {
			method: 'GET',
			headers,
		});
		if (!resp.ok) {
			throw new Error(
				`Failed to list models: ${resp.status} ${resp.statusText}\n${await resp.text()}`
			);
		}
		const respBody = await resp.json();
		let lst: ModelRespItem[] = [];
		if (Array.isArray(respBody.data)) {
			lst = respBody.data;
		} else if (Array.isArray(respBody)) {
			lst = respBody;
		}
		return lst.map((item) => {
			let id = item.id;
			if (item.id.startsWith('azureml://')) {
				id = id.split('/')[5];
			}
			return {
				id,
				object: item.object,
				ownedBy: item.owned_by,
				created: item.created,
			};
		});
	}
}
