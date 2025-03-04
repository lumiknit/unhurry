import { History, Message } from './message';

export type Model = {
	id: string;
	object: string;
	ownedBy: string;
	created: number;
};

export interface ILLMService {
	chat(systemPrompt: string, history: History): Promise<Message>;
	listModels(): Promise<Model[]>;
}
