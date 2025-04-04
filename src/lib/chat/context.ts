import { uniqueID } from '../utils';
import { ChatHistory } from './structs';

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
	progressing: boolean;
}

export type ChatContext = ChatMeta &
	RunContext & {
		history: ChatHistory;
	};

/**
 * Create an empty chat context.
 */
export const emptyChatContext = (): ChatContext => ({
	_id: uniqueID(),
	createdAt: Date.now(),
	lastUsedAt: Date.now(),
	title: '',
	history: {
		msgPairs: [],
	},
	progressing: false,
});

/**
 * Extract chat metadata from the chat context.
 */
export const extractChatMeta = (c: ChatContext): ChatMeta =>
	Object.fromEntries(
		chatMetaFields.map((k) => [k, c[k]])
	) as unknown as ChatMeta;
