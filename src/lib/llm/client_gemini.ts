import { ILLMService, Model, StreamCallbacks } from './client_interface';
import { RateLimitError } from './errors';
import { FunctionTool } from './function';
import { readSSEJSONStream } from './json_stream_reader';
import {
	LLMMessages,
	LLMMessage,
	LLMMsgContent,
	Role,
	FunctionCallContent,
} from './message';
import { ModelConfig } from './model_config';

/**
 * Gemini LLM Message Role
 */
type GeminiRole = 'model' | 'user';

/**
 * Gemini text content part
 */
interface GeminiTextPart {
	text: string;
}

/**
 * Gemini inline data content part
 * (e.g. image)
 */
interface GeminiInlineDataPart {
	mime_type: string;
	data: string;
}

/**
 * Gemini inline data content part
 * (e.g. image)
 */
interface GeminiFileDataPart {
	mime_type: string;
	file_uri: string;
}

/**
 * Gemini functionCall part
 */
interface GeminiFunctionCallPart {
	functionCall: {
		name: string;
		args: Record<string, any>;
	};
}

/**
 * Gemini functionResponse part
 */
interface GeminiFunctionResponsePart {
	functionResponse: {
		name: string;
		response: {
			name: string;
			content: any;
		};
	};
}

type GeminiPart =
	| GeminiTextPart
	| GeminiInlineDataPart
	| GeminiFileDataPart
	| GeminiFunctionCallPart
	| GeminiFunctionResponsePart;

/**
 * Gemini LLM Content
 */
interface GeminiContent {
	parts: GeminiPart[];
	role: GeminiRole;
}

interface GenerateContentCandidate {
	avgLogprobs: number;
	content: GeminiContent;
	finishReason: string;
}

interface GeminiGeneateContentResponse {
	candidates: GenerateContentCandidate[];
	modelVersion: string;
	usageMetadata: {
		candidatesTokenCount: number;
		promptTokenCount: number;
		totalTokenCount: number;
	};
}

interface GeminiStreamChunk {
	candidates: GenerateContentCandidate[];
	usageMetadata: {
		promptTokenCount: number;
		totalTokenCount: number;
	};
	modelVersion: string;
}

export class GeminiClient implements ILLMService {
	config: ModelConfig;
	functions: FunctionTool[] = [];

	constructor(config: ModelConfig) {
		if (config.clientType !== 'Gemini') {
			throw new Error('Invalid client type');
		}

		this.config = config;
	}

	setFunctions(functions: FunctionTool[]): void {
		this.functions = functions;
	}

	/**
	 * Convert LLM messages (openai format) to Gemini format.
	 */
	convertMessagesForGemini(messages: LLMMessages): GeminiContent[] {
		const roleMap: Record<Role, GeminiRole> = {
			system: 'user',
			user: 'user',
			assistant: 'model',
		};
		const out: GeminiContent[] = [];
		for (const msg of messages) {
			// Check role first
			if (
				out.length === 0 ||
				out[out.length - 1].role !== roleMap[msg.role]
			) {
				out.push({
					parts: [],
					role: roleMap[msg.role],
				});
			}
			const last = out[out.length - 1];
			const fnResults: GeminiFunctionResponsePart[] = [];
			if (typeof msg.content === 'string') {
				if (msg.content.length === 0) continue;
				last.parts.push({
					text: msg.content,
				});
			} else {
				for (const item of msg.content) {
					switch (item.type) {
						case 'text':
							last.parts.push({
								text: item.text,
							});
							break;
						case 'image_url':
							last.parts.push({
								mime_type: 'image',
								data: item.url,
							});
							break;
						case 'function_call':
							last.parts.push({
								functionCall: {
									name: item.name,
									args: JSON.parse(item.args),
								},
							});
							if (item.result !== undefined) {
								fnResults.push({
									functionResponse: {
										name: item.name,
										response: {
											name: item.name,
											content: item.result,
										},
									},
								});
							}
							break;
					}
				}
			}
			if (fnResults.length > 0) {
				// Function results should be pushed as user message
				if (out.length === 0 || out[out.length - 1].role !== 'user') {
					out.push({
						parts: [],
						role: 'user',
					});
				}
				out[out.length - 1].parts.push(...fnResults);
			}
		}
		return out.filter((c) => c.parts.length > 0);
	}

	private chatCompletionBody(system: string, history: LLMMessages): string {
		let tools = undefined;
		if (this.functions.length > 0) {
			tools = [{ function_declarations: this.functions }];
		}
		return JSON.stringify({
			contents: this.convertMessagesForGemini(history),
			system_instruction: {
				parts: [
					{
						text: system,
					},
				],
			},
			tools,
		});
	}

	async chat(
		systemPrompt: string,
		history: LLMMessages
	): Promise<LLMMessage> {
		const url = `${this.config.endpoint}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

		const headers = {
			'Content-Type': 'application/json',
		};

		const resp = await fetch(url, {
			method: 'POST',
			headers,
			body: this.chatCompletionBody(systemPrompt, history),
		});
		if (!resp.ok) {
			throw new Error(
				`Failed to chat: ${resp.status} ${resp.statusText}\n${await resp.text()}`
			);
		}
		const respBody = (await resp.json()) as GeminiGeneateContentResponse;
		const lastMessage = respBody.candidates[0].content;
		let content: LLMMsgContent = [];
		for (const part of lastMessage.parts) {
			if ('text' in part) {
				content.push({
					type: 'text',
					text: part.text,
				});
			} else if ('data' in part) {
				content.push({
					type: 'image_url',
					url: part.data,
				});
			} else if ('functionCall' in part) {
				content.push({
					type: 'function_call',
					id: part.functionCall.name,
					name: part.functionCall.name,
					args: JSON.stringify(part.functionCall.args),
				});
			}
		}
		if (content.length === 1 && content[0].type === 'text') {
			content = content[0].text;
		}
		return LLMMessage.assistant(content);
	}

	async chatStream(
		systemPrompt: string,
		history: LLMMessages,
		callbacks: StreamCallbacks
	): Promise<LLMMessage> {
		const url = `${this.config.endpoint}/models/${this.config.model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`;

		const headers = {
			'Content-Type': 'application/json',
		};

		const resp = await fetch(url, {
			method: 'POST',
			headers,
			body: this.chatCompletionBody(systemPrompt, history),
		});
		if (!resp.ok) {
			throw new Error(
				`Failed to chat: ${resp.status} ${resp.statusText}\n${await resp.text()}`
			);
		}

		// SSE
		const reader = resp.body?.getReader();
		if (!reader) {
			throw new Error('Failed to get reader');
		}
		let content: LLMMsgContent = '';
		const fc: FunctionCallContent[] = [];
		await readSSEJSONStream<GeminiStreamChunk>(reader, (chunk) => {
			const lastMessage = chunk.candidates[0].content;

			let gen = '';
			for (const part of lastMessage.parts) {
				if ('text' in part) {
					gen += part.text;
				} else if ('functionCall' in part) {
					fc.push({
						type: 'function_call',
						id: part.functionCall.name,
						name: part.functionCall.name,
						args: JSON.stringify(part.functionCall.args),
					});
					callbacks.onFunctionCall?.(
						0,
						part.functionCall.name,
						JSON.stringify(part.functionCall.args)
					);
				}
			}
			content += gen;

			callbacks.onText?.(gen);

			if (callbacks.isCancelled?.()) {
				reader.cancel();
				console.log('Cancelled');
			}
		});

		if (fc.length > 0) {
			content = [
				{
					type: 'text',
					text: content,
				},
				...fc,
			];
		}

		return LLMMessage.assistant(content);
	}

	async listModels(): Promise<Model[]> {
		interface ModelRespItem {
			name: string;
			version: string;
			displayName: string;
			description: string;
			inputTokenLimit: number;
			outputTokenLimit: number;
			supportedGenerationMethods: string[];
		}

		const url = `${this.config.endpoint}/models?key=${this.config.apiKey}`;
		const headers = {
			'Content-Type': 'application/json',
		};
		const resp = await fetch(url, {
			method: 'GET',
			headers,
		});
		if (!resp.ok) {
			if (resp.status === 429) {
				throw new RateLimitError(await resp.text());
			}
			throw new Error(
				`Failed to list models: ${resp.status} ${resp.statusText}\n${await resp.text()}`
			);
		}
		const respBody = (await resp.json()) as { models: ModelRespItem[] };
		return respBody.models.map((item) => {
			let id = item.name;
			if (id.startsWith('models/')) {
				id = id.slice('models/'.length);
			}
			return {
				id,
				object: item.displayName,
				ownedBy: '',
				created: 0,
			};
		});
	}
}
