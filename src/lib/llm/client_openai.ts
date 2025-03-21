import { ILLMService, Model } from './client_interface';
import { RateLimitError } from './errors';
import { readSSEJSONStream } from './json_stream_reader';
import { LLMMessages, Message } from './message';
import { ModelConfig } from './model_config';

interface ChatChoice {
	message: {
		role: string;
		content: string;
	};
}

interface ChatCompletionResponse {
	choices: ChatChoice[];
}

interface ChatStreamChoice {
	index: number;
	delta: {
		content: string;
	};
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

	constructor(config: ModelConfig) {
		if (config.clientType !== 'OpenAI') {
			throw new Error('Invalid client type');
		}

		this.config = config;
	}

	async chat(systemPrompt: string, history: LLMMessages): Promise<Message> {
		const url = `${this.config.endpoint}/chat/completions`;

		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${this.config.apiKey}`,
			Accept: 'application/json',
		};

		const reqBody = JSON.stringify({
			model: this.config.model,
			messages: [
				{
					role: 'system',
					content: systemPrompt,
				},
				...history,
			],
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
		const respBody = (await resp.json()) as ChatCompletionResponse;
		const lastMessage = respBody.choices[0].message;
		return Message.assistant(lastMessage.content);
	}

	async chatStream(
		systemPrompt: string,
		history: LLMMessages,
		messageCallback: (s: string, acc: string) => boolean
	): Promise<Message> {
		const url = `${this.config.endpoint}/chat/completions`;
		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${this.config.apiKey}`,
		};
		const body = {
			model: this.config.model,
			messages: [
				{
					role: 'system',
					content: systemPrompt,
				},
				...history,
			],
			stream: true,
		};
		// Use SSE
		const resp = await fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});
		if (!resp.ok) {
			if (resp.status === 429) {
				throw new RateLimitError(await resp.text());
			}
			throw new Error(
				`Failed to chat stream: ${resp.status} ${resp.statusText}\n${await resp.text()}`
			);
		}
		const reader = resp.body?.getReader();
		if (!reader) {
			throw new Error('Failed to get response reader');
		}
		let acc = '';
		await readSSEJSONStream<ChatStreamChunk>(reader, (chunk) => {
			const m = chunk.choices[0].delta.content || '';
			acc += m;
			const cont = messageCallback(m, acc);
			if (!cont) {
				reader.cancel();
			}
		});
		return Message.assistant(acc);
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
