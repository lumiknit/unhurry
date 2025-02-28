import { History, Message } from './message';

export interface ILLMService {
	chat(systemPrompt: string, history: History): Promise<Message>;
}
