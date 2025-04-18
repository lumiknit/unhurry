/// Global store

import { createEffect, createSignal } from 'solid-js';
import { createStore, StoreSetter, unwrap } from 'solid-js/store';

import { chatManager } from '@/lib/chat-manager/manager';
import { logr } from '@/lib/logr';

import { ChatContext, MsgPart } from '../lib/chat';
import { sanitizeConfig, UserConfig } from '../lib/config';
import { loadUserConfig, saveUserConfig } from '../lib/idb';

// Streaming message state
// parts is an array of completed message parts,
// and rest is an array of generating message parts

/**
 * Streamed message part signal
 */
export const [getStreamingParts, setStreamingParts] = createSignal<MsgPart[]>(
	[]
);

/**
 * Streamed message rest (not parsed yet) signal
 */
export const [getStreamingRest, setStreamingRest] = createSignal<string>('');

export const resetStreaming = () => {
	setStreamingParts([]);
	setStreamingRest('');
};

/**
 * Whether current focusd chat is progressing. (LLM is running)
 */
export const [getFocusedChatProgressing, setFocusedChatProgressing] =
	createSignal<boolean>(false);

/**
 * Whether current focused chat uphurry is running
 */
export const [getFocusedChatUphurryProgress, setFocusedChatUphurryProgress] =
	createSignal<boolean>(false);

interface GlobalStore {
	// Configurations
	userConfig?: UserConfig;

	/**
	 * Auto send launch timestamp
	 */
	autoSendLaunchAt: number | null;
}

export const [store, setStore] = createStore<GlobalStore>({
	autoSendLaunchAt: null,
});

// Config

(async () => {
	const c = await loadUserConfig<UserConfig>();
	const userConfig = sanitizeConfig(c);
	setStore('userConfig', userConfig);
})();

export const getUserConfig = () => store.userConfig;
export const setUserConfig = (setter: StoreSetter<UserConfig>) => {
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
	// Propagate to the current context
	const chatContext = getChatContext();
	chatManager.setChatOpts(chatContext._id, {
		modelConfigs: c.models.slice(c.currentModelIdx),
		toolConfigs: c.tools,
		enableLLMFallback: c.enableLLMFallback,
	});
});

export const getCurrentChatOpts = () => {
	const config = unwrap(getUserConfig());
	if (!config) {
		return {
			modelConfigs: [],
			toolConfigs: {},
			enableLLMFallback: false,
		};
	}
	const opts = {
		modelConfigs: config.models.slice(config.currentModelIdx),
		toolConfigs: config.tools,
		enableLLMFallback: config.enableLLMFallback,
	};
	return opts;
};

// Chat Context

export const [getChatContext, setChatContext] = createSignal<ChatContext>(
	chatManager.emptyChat({
		modelConfigs: [],
		toolConfigs: {},
		enableLLMFallback: false,
	})
);

export const [getUphurryMode, setUphurryMode] = createSignal<boolean>(false);

export const [getNextURL, goto] = createSignal<string | undefined>(undefined, {
	equals: false,
});
