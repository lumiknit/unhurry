import { ILLMService, Model } from './client_interface';
import { History, Message } from './message';
import { ModelConfig } from './model_config';

type ChatChoice = {
	message: {
		role: string;
		content: string;
	};
};

type ChatCompletionResponse = {
	choices: ChatChoice[];
};

export class OpenAIClient implements ILLMService {
	config: ModelConfig;

	constructor(config: ModelConfig) {
		if (config.clientType !== 'OpenAI') {
			throw new Error('Invalid client type');
		}

		this.config = config;
	}

	async chat(systemPrompt: string, history: History): Promise<Message> {
		const url = `${this.config.endpoint}/chat/completions`;

		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${this.config.apiKey}`,
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
		return {
			role: 'assistant',
			content: lastMessage.content,
		};
	}

	async listModels(): Promise<Model[]> {
		type ModelRespItem = {
			id: string;
			object: string;
			owned_by: string;
			created: number;
		};
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
		const respBody = (await resp.json()) as { data: ModelRespItem[] };
		return respBody.data.map((item) => ({
			id: item.id,
			object: item.object,
			ownedBy: item.owned_by,
			created: item.created,
		}));
	}
}
