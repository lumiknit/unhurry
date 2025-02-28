import { JSContext } from '../run-js';
import { ChatHistory } from './structs';

export type ChatContext = {
	title: string;

	history: ChatHistory;

	jsContext: JSContext;
};

export const emptyChatContext = (): ChatContext => ({
	title: '',
	history: {
		messages: [],
	},
	jsContext: new JSContext(),
});
