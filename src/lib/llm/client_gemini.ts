import { ILLMService, Model } from './client_interface';
import { RateLimitError } from './errors';
import { readSSEJSONStream } from './json_stream_reader';
import { LLMMessages, Message, MessageContent, Role } from './message';
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

type GeminiPart = GeminiTextPart | GeminiInlineDataPart | GeminiFileDataPart;

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

	constructor(config: ModelConfig) {
		if (config.clientType !== 'Gemini') {
			throw new Error('Invalid client type');
		}

		this.config = config;
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
			if (typeof msg.content === 'string') {
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
					}
				}
			}
		}
		return out;
	}

	async chat(systemPrompt: string, history: LLMMessages): Promise<Message> {
		const url = `${this.config.endpoint}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

		const headers = {
			'Content-Type': 'application/json',
		};

		const contents = this.convertMessagesForGemini(history);

		const reqBody = JSON.stringify({
			contents,
			system_instruction: {
				parts: [
					{
						text: systemPrompt,
					},
				],
			},
		});
		const resp = await fetch(url, {
			method: 'POST',
			headers,
			body: reqBody,
		});
		if (!resp.ok) {
			throw new Error(
				`Failed to chat: ${resp.status} ${resp.statusText}\n${await resp.text()}`
			);
		}
		const respBody = (await resp.json()) as GeminiGeneateContentResponse;
		const lastMessage = respBody.candidates[0].content;
		let content: MessageContent = [];
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
			}
		}
		if (content.length === 1 && content[0].type === 'text') {
			content = content[0].text;
		}
		return {
			role: 'assistant',
			content,
		};
	}

	async chatStream(
		systemPrompt: string,
		history: LLMMessages,
		messageCallback: (s: string, acc: string) => boolean
	): Promise<Message> {
		const url = `${this.config.endpoint}/models/${this.config.model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`;

		const headers = {
			'Content-Type': 'application/json',
		};

		const contents = this.convertMessagesForGemini(history);

		const reqBody = JSON.stringify({
			contents,
			system_instruction: {
				parts: [
					{
						text: systemPrompt,
					},
				],
			},
		});
		const resp = await fetch(url, {
			method: 'POST',
			headers,
			body: reqBody,
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
		let content = '';
		await readSSEJSONStream<GeminiStreamChunk>(reader, (chunk) => {
			const lastMessage = chunk.candidates[0].content;

			let gen = '';
			for (const part of lastMessage.parts) {
				if ('text' in part) {
					gen += part.text;
				}
			}
			content += gen;

			const cont = messageCallback(gen, content);
			if (!cont) {
				reader.cancel();
				console.log('Cancelled');
			}
		});

		return {
			role: 'assistant',
			content,
		};
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
