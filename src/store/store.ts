/// Global store

import { createEffect, createSignal, Setter } from 'solid-js';

import { chatManager } from '@/lib/chat-manager/manager';
import { logr } from '@/lib/logr';

import { ChatContext, MsgPart } from '../lib/chat';
import { sanitizeConfig, UserConfig } from '../lib/config';
import { loadUserConfig, saveUserConfig } from '../lib/idb';

// Global store

/**
 * Navigate Helper. This signal is used in the root component, to navigate to the next URL.
 */
export const [getNextURL, goto] = createSignal<string | undefined>(undefined, {
	equals: false,
});

/**
 * User Config Helper. This signal is used in the root component, to get the user config.
 */
export const [getUserConfig, setUserConfig_] = createSignal<UserConfig>(
	undefined!,
	{
		equals: false,
	}
);

/**
 * Auto send launch timestamp
 */
export const [autoSendLaunchAt, setAutoSendLaunchAt] = createSignal<
	number | null
>(null, {
	equals: false,
});

// Config

(async () => {
	const c = await loadUserConfig<UserConfig>();
	const userConfig = sanitizeConfig(c);
	setUserConfig_(userConfig);
})();

export const setUserConfig: Setter<UserConfig> = (setter) => {
	logr.info('[store/config] User config updated, will save persistently');
	const v = setUserConfig_(setter);
	saveUserConfig(v);
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
	const config = getUserConfig();
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

// Streaming message state
// parts is an array of completed message parts,
// and rest is an array of generating message parts

/**
 * Current chat warning
 */
export const [getChatWarnings, setChatWarnings] = createSignal<string[]>([], {
	equals: false,
});

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

/**
 * Reset current streaming state
 */
export const resetStreamingState = () => {
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
