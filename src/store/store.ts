/// Global store

import { createEffect } from 'solid-js';
import { createStore, StoreSetter, unwrap } from 'solid-js/store';
import { toast } from 'solid-toast';

import { logr } from '@/lib/logr';

import {
	ChatContext,
	ChatMeta,
	emptyChatContext,
	extractChatMeta,
	MsgPair,
	MsgPart,
} from '../lib/chat';
import { sanitizeConfig, UserConfig } from '../lib/config';
import { chatListTx, chatTx, loadUserConfig, saveUserConfig } from '../lib/idb';

interface StreamingMessage {
	parts: MsgPart[];
	rest: string;
}

interface GlobalStore {
	chatContext: ChatContext;
	streamingMessage?: StreamingMessage;

	userConfig?: UserConfig;

	/**
	 * Auto send set timestamp
	 */
	autoSendSetAt?: number;

	/**
	 * Auto send launch timestamp
	 */
	autoSendLaunchAt?: number;
}

export const [store, setStore] = createStore<GlobalStore>({
	chatContext: emptyChatContext(),
});

// Config

(async () => {
	const c = await loadUserConfig<UserConfig>();
	const userConfig = sanitizeConfig(c);
	setStore('userConfig', userConfig);
})();

export const getUserConfig = () => store.userConfig;
export const setUserConfig = (setter: StoreSetter<UserConfig>) => {
	toast('Config updated', {
		duration: 500,
	});
	logr.info('[store/config] User config updated, will save persistently');
	setStore(
		'userConfig',
		setter as StoreSetter<UserConfig | undefined, ['userConfig']>
	);
	// Save to IDB
	saveUserConfig(unwrap(getUserConfig()));
};

createEffect(() => {
	const c = getUserConfig();
	if (!c) return;
	if (c.fontFamily === 'sans-serif') {
		document.querySelector(':root')?.classList.remove('font-serif');
	} else {
		document.querySelector(':root')?.classList.add('font-serif');
	}
});

// Chat Context

export const getChatContext = () => store.chatContext;
export const setChatContext = (setter: StoreSetter<ChatContext>) => {
	setStore(
		'chatContext',
		setter as StoreSetter<ChatContext, ['chatContext']>
	);
};

export const saveChatContextMeta = async () => {
	const ctx = getChatContext();
	const chatList = await chatListTx<ChatMeta>();
	await chatList.put(extractChatMeta(unwrap(ctx)));
};

export const loadChatContext = async (id: string) => {
	const chatList = await chatListTx<ChatMeta>();
	const m = await chatList.get(id);
	if (!m) {
		throw new Error(`Chat not found: ${id}`);
	}
	// Update lastUsedAt
	m.lastUsedAt = Date.now();
	await chatList.put(m);
	const msgDB = await chatTx<MsgPair>(id);
	const msgs = await msgDB.getAll();
	setChatContext(() => ({
		...m,
		history: {
			msgPairs: msgs,
		},
	}));
};

// Streaming message

export const getStreamingMessage = () => store.streamingMessage;
export const setStreamingMessage = (
	setter: StoreSetter<StreamingMessage | void>
) => {
	setStore(
		'streamingMessage',
		setter as StoreSetter<
			StreamingMessage | undefined,
			['streamingMessage']
		>
	);
};
