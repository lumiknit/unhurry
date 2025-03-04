import { ILLMService, Model } from './client_interface';
import { History, Message, Role } from './message';
import { ModelConfig } from './model_config';

type GeminiRole = 'model' | 'user';

type GeminiContent = {
	parts: {
		text: string;
	}[];
	role: GeminiRole;
};

type GenerateContentCandidate = {
	avgLogprobs: number;
	content: GeminiContent;
	finishReason: string;
};

type GeminiGeneateContentResponse = {
	candidates: GenerateContentCandidate[];
	modelVersion: string;
	usageMetadata: {
		candidatesTokenCount: number;
		promptTokenCount: number;
		totalTokenCount: number;
	};
};

export class GeminiClient implements ILLMService {
	config: ModelConfig;

	constructor(config: ModelConfig) {
		if (config.clientType !== 'Gemini') {
			throw new Error('Invalid client type');
		}

		this.config = config;
	}

	textContent(role: GeminiRole, text: string): GeminiContent {
		return {
			parts: [
				{
					text,
				},
			],
			role,
		};
	}

	convertHistoryForGemini(
		systemPrompt: string,
		history: History
	): GeminiContent[] {
		const roleMap: Record<Role, GeminiRole> = {
			system: 'user',
			user: 'user',
			assistant: 'model',
		};
		const mapped = history.map((msg) => {
			return this.textContent(roleMap[msg.role], msg.content);
		});
		mapped.unshift(this.textContent('user', systemPrompt));
		for (let i = mapped.length - 2; i >= 0; i--) {
			if (mapped[i].role === mapped[i + 1].role) {
				const mergedMsg =
					mapped[i].parts[0].text +
					'\n' +
					mapped[i + 1].parts[0].text;
				mapped.splice(
					i,
					2,
					this.textContent(mapped[i].role, mergedMsg)
				);
			}
		}
		return mapped;
	}

	async chat(systemPrompt: string, history: History): Promise<Message> {
		const url = `${this.config.endpoint}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

		const headers = {
			'Content-Type': 'application/json',
		};

		const contents = this.convertHistoryForGemini(systemPrompt, history);

		const reqBody = JSON.stringify({
			contents,
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
		return {
			role: 'assistant',
			content: lastMessage.parts.reduce(
				(acc, part) => acc + part.text,
				''
			),
		};
	}

	async listModels(): Promise<Model[]> {
		type ModelRespItem = {
			name: string;
			version: string;
			displayName: string;
			description: string;
			inputTokenLimit: number;
			outputTokenLimit: number;
			supportedGenerationMethods: string[];
		};

		const url = `${this.config.endpoint}/models?key=${this.config.apiKey}`;
		const headers = {
			'Content-Type': 'application/json',
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
