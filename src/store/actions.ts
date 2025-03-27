// Store-based actions
import { unwrap } from 'solid-js/store';
import { toast } from 'solid-toast';

import { getBEService, VibrationPattern } from '@/lib/be';
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
	MSG_PART_TYPE_FILE,
} from '../lib/chat';
import { chatListTx, chatTx } from '../lib/idb';
import {
	BadRequestError,
	LLMMessage,
	newClientFromConfig,
	RateLimitError,
	RequestEntityTooLargeError,
} from '../lib/llm';

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

	const history = unwrap(chatContext.history);

	const action = new SingleChatAction(
		config.models.slice(config.currentModelIdx),
		history
	);
	actions.push(action);

	action.onChunk = (_chunk, parts, rest) => {
		vibrate(4);
		setStreamingMessage({
			parts: [...parts],
			rest,
		});
	};
	action.onLLMFallback = (err, _idx, mc) => {
		let reason = `'${mc.name}' failed. `;
		if (err instanceof BadRequestError) {
			reason +=
				'(400) Maybe the input is invalid, or some inputs are not supported. (e.g. Image, ToolCall)';
		} else if (err instanceof RequestEntityTooLargeError) {
			reason += '(413) Maybe chat history is too long.';
		} else if (err instanceof RateLimitError) {
			reason += '(429) Rate limit.';
		} else {
			reason += `(${err.message})`;
		}
		if (getUserConfig()?.enableLLMFallback) {
			toast(`${reason} Trying another model...`);
			return true;
		} else {
			toast.error(reason);
			return false;
		}
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
