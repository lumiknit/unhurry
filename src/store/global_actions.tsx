// Store-based actions
import { batch, untrack } from 'solid-js';
import { toast } from 'solid-toast';

import { getBEService, VibrationPattern } from '@/lib/be';
import { chatManager } from '@/lib/chat-manager/manager';
import { scrollToLastUserMessage, scrollToTop } from '@/lib/utils';
import { getUserConfig } from '@/store/config';
import { goto } from '@/store/nav';

import {
	getChatContext,
	getCurrentChatOpts,
	resetStreamingState,
	setChatContext,
	setChatWarnings,
	setCurChatProcessing,
	setFocusedChatUphurryProgress,
	setStreamingParts,
	setStreamingRest,
} from './store';
import { MsgConverter, MSG_PART_TYPE_ARTIFACT } from '../lib/chat';

/**
 * Vibration
 */
export const vibrate = async (pattern: VibrationPattern) => {
	const be = await getBEService();
	if (untrack(getUserConfig)?.enableVibration) {
		be.vibrate(pattern);
	}
};

/**
 * Reset the chat context
 */
export const resetChatMessages = () => {
	batch(() => {
		setChatContext({ ...chatManager.emptyChat(getCurrentChatOpts()) });
		resetStreamingState();
		setCurChatProcessing(false);
	});
	scrollToTop();
};

export const loadChatContext = async (id: string) => {
	// Load chat
	const ctx = await chatManager.loadChat(id, getCurrentChatOpts());
	const progress = chatManager.getProgress(id);
	batch(() => {
		setChatContext({ ...ctx });
		resetStreamingState();
		setCurChatProcessing(progress.llm);
		setFocusedChatUphurryProgress(progress.uphurry);
	});
	chatManager.checkChat(id);
	scrollToLastUserMessage();
};

export const setTitle = (title: string) => {
	const ctx = getChatContext();
	if (!ctx) {
		throw new Error('No chat context');
	}
	chatManager.updateChatMeta(ctx._id, {
		title: title,
	});
};

export const generateChatTitle = async () => {
	const ctx = getChatContext();
	if (!ctx) {
		throw new Error('No chat context');
	}
	await toast.promise(chatManager.generateChatTitle(ctx._id), {
		loading: 'Generating title...',
		success: 'Title generated',
		error: 'Failed to generate title',
	});
};

export const compactChat = async (toClear?: boolean) => {
	const ctx = getChatContext();
	if (!ctx) {
		throw new Error('No chat context');
	}
	await toast.promise(chatManager.compactChat(ctx._id, toClear), {
		loading: 'Compacting chat...',
		success: 'Chat compacted',
		error: 'Failed to compact chat',
	});
};

export const chat = async (
	text: string,
	artifactIDs?: string[],
	uphurry?: boolean
) => {
	const config = getUserConfig();
	if (!config) {
		throw new Error('No user config');
	}

	const chatContext = getChatContext();
	if (!chatContext) {
		throw new Error('No chat context');
	}

	const parts = MsgConverter.parse(text);

	if (artifactIDs) {
		for (const id of artifactIDs) {
			parts.push({
				type: MSG_PART_TYPE_ARTIFACT,
				content: id,
			});
		}
	}

	const ctx = await chatManager.loadChat(
		chatContext._id,
		getCurrentChatOpts()
	);
	if (uphurry) {
		chatManager.setChatRequest(ctx._id, {
			type: 'uphurry',
			comment: parts[0]?.content,
		});
	} else {
		chatManager.setChatRequest(ctx._id, {
			type: 'user-msg',
			message: parts,
		});
	}

	chatManager.checkChat(ctx._id);
};

export const cancelCurrentChat = () => {
	const chatContext = getChatContext();
	chatManager.cancelChat(chatContext._id);
};

export const gotoNewChat = () => {
	goto('/');
	resetChatMessages();
	toast.success('New notebook created');
};

export const openChat = async (id: string) => {
	await toast.promise(loadChatContext(id), {
		loading: 'opening chat...',
		success: 'Opened',
		error: 'Error during open chat',
	});
	goto('/');
};

// ChatManager
chatManager.onContextUpdate = (ctx) => {
	if (ctx._id !== getChatContext()._id) {
		return false;
	}
	setChatContext({ ...ctx });
	return true;
};

chatManager.onWarning = (id, warning) => {
	const ctx = untrack(getChatContext);
	if (ctx._id !== id) {
		return;
	}
	setChatWarnings(warning);
};

chatManager.onChunk = (id, parts, rest) => {
	const ctx = untrack(getChatContext);
	if (ctx._id !== id) {
		return;
	}
	vibrate(4);
	batch(() => {
		if (parts !== null) {
			setStreamingParts(parts);
		}
		setStreamingRest(rest);
	});
};

chatManager.onMessage = async (id, msgPairs) => {
	const ctx = untrack(getChatContext);
	if (ctx._id !== id) {
		return;
	}
	resetStreamingState();
	setChatContext((c) => ({
		...c,
		history: {
			msgPairs: [...msgPairs],
		},
	}));
	setTimeout(() => {
		scrollToLastUserMessage();
	}, 33);
};

chatManager.onChatProcessingChange = (id, progress) => {
	const ctx = untrack(getChatContext);
	if (ctx._id !== id) {
		return;
	}
	setCurChatProcessing(progress);
};

chatManager.onUphurryProgressChange = (id, progress) => {
	const ctx = untrack(getChatContext);
	if (ctx._id !== id) {
		return;
	}
	setFocusedChatUphurryProgress(progress);
};

chatManager.onFinish = (id, ctx) => {
	const curr = untrack(getChatContext);
	if (curr._id === id) {
		return;
	}
	const title = ctx.title || 'untitled';
	toast.success((t) => {
		const handle = () =>
			toast.promise(
				(async () => {
					toast.dismiss(t.id);
					await openChat(id);
					return true;
				})(),
				{
					loading: 'Loading...',
					success: 'Chat loaded',
					error: 'Failed to load chat',
				}
			);
		return (
			<a href="#" class="text-sm" onClick={handle}>
				New message: <b class="is-underlined">{title}</b>
			</a>
		);
	});
};

chatManager.start();
