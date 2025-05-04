/// Global store

import { createEffect, createSignal } from 'solid-js';

import { chatManager } from '@/lib/chat-manager/manager';

import { getUserConfig } from './config';
import { ChatContext, MsgPart } from '../lib/chat';

// Global store

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
export const [getCurChatProcessing, setCurChatProcessing] =
	createSignal<boolean>(false);

/**
 * Whether current focused chat uphurry is running
 */
export const [getFocusedChatUphurryProgress, setFocusedChatUphurryProgress] =
	createSignal<boolean>(false);

export const [getShowRawMessage, setShowRawMessage] =
	createSignal<boolean>(false);
