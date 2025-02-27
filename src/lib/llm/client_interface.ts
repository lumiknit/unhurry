import { History, Message } from './message';

export interface ILLMService {
	chat(history: History): Promise<Message>;
}
