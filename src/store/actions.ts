// Store-based actions
import { unwrap } from 'solid-js/store';
import { toast } from 'solid-toast';

import { SingleChatAction } from '@/lib/chat/llm';
import { logr } from '@/lib/logr';

import {
	getChatContext,
	getUserConfig,
	setChatContext,
	setStreamingMessage,
} from './store';
import {
	convertChatHistoryForLLM,
	ChatMeta,
	emptyChatContext,
	extractChatMeta,
	MsgPair,
	MsgPartsParser,
} from '../lib/chat';
import { chatListTx, chatTx } from '../lib/idb';
import { LLMMessage, newClientFromConfig } from '../lib/llm';

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
	const llmHistory = getLLMHistory();
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
const getLLMHistory = () => {
	const context = getChatContext();
	return convertChatHistoryForLLM(context.history);
};

export const saveCurrentChatToDB = async () => {
	// Using DB, save the chat history
	try {
		const ctx = getChatContext();
		await Promise.all([
			(async () => {
				const chatList = await chatListTx<ChatMeta>();
				const m = await chatList.get(ctx._id);
				if (!m) {
					await chatList.put(extractChatMeta(unwrap(ctx)));
				}
			})(),
			(async () => {
				const chatDB = await chatTx<MsgPair>(ctx._id);
				const lastPair = unwrap(
					ctx.history.msgPairs[ctx.history.msgPairs.length - 1]
				);
				chatDB.put(lastPair);
			})(),
		]);
	} catch (e) {
		toast.error('Failed to push history into IDB');
		logr.error(e);
	}
};

export let actions: SingleChatAction[] = [];

export const chat = async (text: string) => {
	const config = getUserConfig();
	if (!config) {
		throw new Error('No user config');
	}

	const chatContext = getChatContext();
	if (!chatContext) {
		throw new Error('No chat context');
	}

	const parts = MsgPartsParser.parse(text);

	const history = unwrap(chatContext.history);

	const action = new SingleChatAction(
		config.models.slice(config.currentModelIdx),
		history
	);
	actions.push(action);

	action.onChunk = (chunk, parts, rest) => {
		setStreamingMessage({
			parts: [...parts],
			rest,
		});
	};
	action.onLLMFallback = (idx, mc) => {
		toast(`Model '${mc.name}' failed, trying next model`);
	};
	action.onUpdate = (idx) => {
		console.log('Update', idx, history);
		setStreamingMessage();
		setChatContext((c) => ({
			...c,
			history: {
				msgPairs: [...history.msgPairs],
			},
		}));
		saveCurrentChatToDB();
	};

	try {
		await action.runWithUserMessage(parts);
	} catch (e) {
		logr.error(e);
		toast.error('Failed to generate');
	}

	actions = actions.filter((a) => a !== action);
};

export const cancelAllChats = () => {
	actions.forEach((a) => a.cancel());
};
