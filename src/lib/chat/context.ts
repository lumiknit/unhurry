import { JSContext } from '../run-js';
import { ChatHistory } from './structs';

export type ChatMeta = {
	_id: string;
	title: string;
	createdAt: number;
};

export type ChatContext = ChatMeta & {
	history: ChatHistory;

	jsContext: JSContext;
};

export const chatID = () => {
	const ts = Date.now().toString(36);
	const rand = Math.random().toString(36).slice(2);
	return ts + '_' + rand;
};

export const emptyChatContext = (): ChatContext => ({
	_id: chatID(),
	createdAt: Date.now(),
	title: '',
	history: {
		msgPairs: [],
	},
	jsContext: new JSContext(),
});

export const getChatMeta = (c: ChatContext): ChatMeta => ({
	_id: c._id,
	title: c.title,
	createdAt: c.createdAt,
});
