import { createSignal, type Accessor, type Setter } from 'solid-js';

import type { Thread } from '../lib/thread/types';

/**
 * Whole store for the chat pages
 */
export type ChatPageStore = {
	/** Active thread ID */
	activeID: string;

	/** List of active threads, ID to thread */
	threads: Record<string, ThreadStore>;
};

export type ThreadStore = {
	/** The data of conversation, which can be saved in the IDB */
	thread: Thread;

	/** */
	isLLMWorking: boolean;

	/** LLM's streaming messages */
	streamingMessage: string | null;

	/** Last submitted messages for current processing */
	submittedMessage: string | null;
};

export const [chatPageStore, setChatPageStore] = createSignal<ChatPageStore>({
	activeID: '',
	threads: {},
});
