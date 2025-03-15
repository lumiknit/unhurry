import { History, Message } from './message';

export type Model = {
	id: string;
	object: string;
	ownedBy: string;
	created: number;
};

export interface ILLMService {
	chat(systemPrompt: string, history: History): Promise<Message>;
	chatStream(
		systemPrompt: string,
		history: History,
		messageCallback: (s: string, acc: string) => boolean
	): Promise<Message>;
	listModels(): Promise<Model[]>;
}
