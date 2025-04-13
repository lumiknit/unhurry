// Store-based actions
import { Navigator, useNavigate } from '@solidjs/router';
import { batch } from 'solid-js';
import { toast } from 'solid-toast';

import { rootPath } from '@/env';
import { getBEService, VibrationPattern } from '@/lib/be';
import { chatManager } from '@/lib/chat-manager/manager';

import {
	getChatContext,
	getCurrentChatOpts,
	getUserConfig,
	setChatContext,
	setFocusedChatProgressing,
	setStreamingMessage,
} from './store';
import { MsgPartsParser, MSG_PART_TYPE_FILE } from '../lib/chat';

/**
 * Vibration
 */
export const vibrate = async (pattern: VibrationPattern) => {
	const be = await getBEService();
	if (getUserConfig()?.enableVibration) {
		be.vibrate(pattern);
	}
};

/**
 * Reset the chat context
 */
export const resetChatMessages = () => {
	batch(() => {
		setChatContext({ ...chatManager.emptyChat(getCurrentChatOpts()) });
		setStreamingMessage();
		setFocusedChatProgressing(false);
	});
};

export const loadChatContext = async (id: string) => {
	// Load chat
	const ctx = await chatManager.loadChat(id, getCurrentChatOpts());
	batch(() => {
		setChatContext({ ...ctx });
		setStreamingMessage();
		setFocusedChatProgressing(chatManager.isProgressing(id));
	});
	chatManager.checkChat(id);
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
	await chatManager.generateChatTitle(ctx._id);
};

export const chat = async (
	text: string,
	fileIDs?: string[],
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

	const parts = MsgPartsParser.parse(text);

	if (fileIDs) {
		for (const id of fileIDs) {
			parts.push({
				type: MSG_PART_TYPE_FILE,
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

export const gotoNewChat = (navigate: Navigator) => {
	navigate(`${rootPath}/`);
	resetChatMessages();
	toast.success('New notebook created');
};

export const openChat = async (navigate: Navigator, id: string) => {
	await loadChatContext(id);
	navigate(`${rootPath}/`);
};

// ChatManager
chatManager.onContextUpdate = (ctx) => {
	if (ctx._id !== getChatContext()._id) {
		return false;
	}
	setChatContext({ ...ctx });
	return true;
};

chatManager.onChunk = (id, parts, rest) => {
	const ctx = getChatContext();
	if (ctx._id !== id) {
		return;
	}
	vibrate(4);
	setStreamingMessage({
		parts: [...parts],
		rest,
	});
};

chatManager.onMessage = async (id, msgPairs) => {
	const ctx = getChatContext();
	if (ctx._id !== id) {
		return;
	}
	setStreamingMessage();
	setChatContext((c) => ({
		...c,
		history: {
			msgPairs: [...msgPairs],
		},
	}));
};

chatManager.onProgressChange = (id, progress) => {
	const ctx = getChatContext();
	if (ctx._id !== id) {
		return;
	}
	setFocusedChatProgressing(progress);
};

chatManager.onFinish = (id, ctx) => {
	const curr = getChatContext();
	if (curr._id === id) {
		return;
	}
	const title = ctx.title || 'untitled';
	toast.success((t) => {
		const navigate = useNavigate();
		const handle = () =>
			toast.promise(
				(async () => {
					toast.dismiss(t.id);
					await openChat(navigate, id);
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
