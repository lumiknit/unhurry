/// Global store

import { createEffect } from 'solid-js';
import { createStore, StoreSetter, unwrap } from 'solid-js/store';
import { toast } from 'solid-toast';

import { chatManager } from '@/lib/chat-manager/manager';
import {
	emptyFocusedChatState,
	FocusedChatState,
} from '@/lib/chat-manager/structs';
import { logr } from '@/lib/logr';

import {
	ChatContext,
	ChatMeta,
	emptyChatContext,
	extractChatMeta,
	MsgPart,
} from '../lib/chat';
import { sanitizeConfig, UserConfig } from '../lib/config';
import { chatListTx, loadUserConfig, saveUserConfig } from '../lib/idb';

interface StreamingMessage {
	parts: MsgPart[];
	rest: string;
}

interface GlobalStore {
	// Focused chat states
	chatContext: ChatContext;

	focusedChatState: FocusedChatState;

	streamingMessage?: StreamingMessage;

	// Configurations
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
	focusedChatState: emptyFocusedChatState(),
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

export const getCurrentChatOpts = () => {
	const config = getUserConfig();
	if (!config) {
		throw new Error('No user config');
	}
	const opts = {
		modelConfigs: config.models.slice(config.currentModelIdx),
		toolConfigs: config.tools,
		enableLLMFallback: config.enableLLMFallback,
	};
	return opts;
};

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
	// Load chat
	const ctx = await chatManager.loadChat(id, getCurrentChatOpts());
	setChatContext(ctx);
	chatManager.focusAndCheck(id);
	setStreamingMessage();
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
