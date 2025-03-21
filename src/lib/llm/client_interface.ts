import { LLMMessages, Message } from './message';

export interface Model {
	id: string;
	object: string;
	ownedBy: string;
	created: number;
}

export interface ILLMService {
	chat(systemPrompt: string, history: LLMMessages): Promise<Message>;
	chatStream(
		systemPrompt: string,
		history: LLMMessages,
		messageCallback: (s: string, acc: string) => boolean
	): Promise<Message>;
	listModels(): Promise<Model[]>;
}
