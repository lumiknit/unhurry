// Store-based actions
import { getBEService, VibrationPattern } from '@/lib/be';
import { chatManager } from '@/lib/chat-manager/manager';
import { logr } from '@/lib/logr';

import {
	getChatContext,
	getCurrentChatOpts,
	getUserConfig,
	setChatContext,
	setStreamingMessage,
} from './store';
import {
	convertChatHistoryForLLM,
	emptyChatContext,
	MsgPartsParser,
	MSG_PART_TYPE_FILE,
} from '../lib/chat';
import { LLMMessage, newClientFromConfig } from '../lib/llm';

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
 * Generate title from the chat context
 */
export const generateChatTitle = async (): Promise<string> => {
	// Get LLM
	const config = getUserConfig();
	if (!config) {
		throw new Error('No user config');
	}

	const modelConfig = config.models[config.currentModelIdx];
	if (!modelConfig) {
		throw new Error('No model config');
	}

	const llm = newClientFromConfig(modelConfig);
	const systemPrompt = `
You are a title generator.
Based on the following conversation, please generate a title for this chat.
- Language should be short and clear (At least 2 words, at most 10 words. Single sentence)
- Should be relevant to the conversation
- Use the most used language in the conversation
- DO NOT answer except the title. You ONLY give a title in plain text.
`.trim();

	// Generate response
	const llmHistory = await getLLMHistory();
	llmHistory.push(
		LLMMessage.user('[Give me a title for the above conversation]')
	);
	const result = await llm.chat(systemPrompt, llmHistory);
	logr.info('[store/action] Generated Title', result);
	const list = result
		.extractText()
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l);
	// Return only last line
	return list[list.length - 1];
};

/**
 * Reset the chat context
 */
export const resetChatMessages = () => {
	setChatContext(emptyChatContext());
};

/**
 * Insert multiple messages to the chat history
 */
const getLLMHistory = async () => {
	const context = getChatContext();
	return await convertChatHistoryForLLM(context.history);
};

chatManager.onChunk = (parts, rest) => {
	vibrate(4);
	setStreamingMessage({
		parts: [...parts],
		rest,
	});
};

chatManager.onMessage = async (msgPairs) => {
	setStreamingMessage();
	setChatContext((c) => ({
		...c,
		history: {
			msgPairs: [...msgPairs],
		},
	}));
};

chatManager.start();

export const chat = async (text: string, fileIDs?: string[]) => {
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
	chatManager.setChatRequest(ctx._id, {
		type: 'user-msg',
		message: parts,
	});
	chatManager.focusAndCheck(ctx._id);
};

export const cancelCurrentChat = () => {
	chatManager.cancelChat();
};
