import { ChatHistory } from './structs';
import { JSContext } from '../run-js';

/**
 * Metadata of the chat context.
 * This is a subset of the ChatContext,
 * lack of messages (ChatHistory)
 * and runtime values (JSContext).
 */
export interface ChatMeta {
	_id: string;
	title: string;
	createdAt: number;
	lastUsedAt?: number;
}

/** Key of the fields */
const chatMetaFields: (keyof ChatMeta)[] = [
	'_id',
	'title',
	'createdAt',
	'lastUsedAt',
];

export interface RunContext {
	jsContext: JSContext;
}

export type ChatContext = ChatMeta &
	RunContext & {
		history: ChatHistory;
	};

/**
 * Generate random Chat ID.
 */
export const genChatID = () => {
	const ts = Date.now().toString(36);
	const rand = Math.random().toString(36).slice(2);
	return ts + '_' + rand;
};

/**
 * Create an empty chat context.
 */
export const emptyChatContext = (): ChatContext => ({
	_id: genChatID(),
	createdAt: Date.now(),
	title: '',
	history: {
		msgPairs: [],
	},
	jsContext: new JSContext(),
});

/**
 * Extract chat metadata from the chat context.
 */
export const extractChatMeta = (c: ChatContext): ChatMeta =>
	Object.fromEntries(
		chatMetaFields.map((k) => [k, c[k]])
	) as unknown as ChatMeta;
