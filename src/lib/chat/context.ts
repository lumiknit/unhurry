import { ChatHistory } from './structs';

/**
 * Metadata of the chat context.
 * This is a subset of the ChatContext,
 * lack of messages (ChatHistory)
 * and runtime values (JSContext).
 */
export interface ChatMeta {
	/** Unique ID */
	_id: string;

	/** Title of chat */
	title: string;

	/** Chat started timestamp */
	createdAt: number;

	/** Chat updated timestamp */
	updatedAt: number;

	/** User checked timestamp. If updatedAt > checkedAt, there is an update */
	checkedAt?: number;
}

/** Key of the fields */
const chatMetaFields: (keyof ChatMeta)[] = [
	'_id',
	'title',
	'createdAt',
	'updatedAt',
	'checkedAt',
];

export type ChatContext = ChatMeta & {
	history: ChatHistory;
};

/**
 * Return true if the chat is updated since last checked.
 */
export const hasChatUpdate = (c: ChatMeta): boolean => {
	return c.checkedAt === undefined || c.updatedAt > c.checkedAt;
};

/**
 * Extract chat metadata from the chat context.
 */
export const extractChatMeta = (c: ChatContext): ChatMeta =>
	Object.fromEntries(
		chatMetaFields.map((k) => [k, c[k]])
	) as unknown as ChatMeta;
