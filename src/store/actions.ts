// Store-based actions
import { unwrap } from 'solid-js/store';
import { toast } from 'solid-toast';
import TurndownService from 'turndown';

import { SingleChatAction } from '@/lib/chat/llm';
import { logr } from '@/lib/logr';

import {
	getChatContext,
	getUserConfig,
	setChatContext,
	setStreamingMessage,
} from './store';
import { getBEService } from '../lib/be';
import {
	convertChatHistoryForLLM,
	ChatMeta,
	emptyChatContext,
	extractChatMeta,
	Msg,
	MsgPair,
	MsgPart,
	parseMessagePartType,
	MsgPartsParser,
} from '../lib/chat';
import { chatListTx, chatTx } from '../lib/idb';
import { Message, newClientFromConfig } from '../lib/llm';

const turndownService = new TurndownService();

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
		Message.user('[Give me a title for the above conversation]')
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

const pushUserMessage = (parts: MsgPart[]) => {
	setChatContext((c) => ({
		...c,
		history: {
			msgPairs: [
				...c.history.msgPairs,
				{
					user: {
						role: 'user',
						parts,
						timestamp: Date.now(),
					},
				},
			],
		},
	}));
};

const pushAssistantMessage = (parts: MsgPart[]) => {
	const m: Msg<'assistant'> = {
		role: 'assistant',
		parts,
		timestamp: Date.now(),
	};

	setChatContext((c) => {
		let mps = c.history.msgPairs;
		const lastPair = mps[mps.length - 1];
		if (lastPair && !lastPair.assistant) {
			mps = [...mps.slice(0, -1), { ...lastPair, assistant: m }];
		} else {
			mps = [...mps, { assistant: m }];
		}
		return {
			...c,
			history: {
				msgPairs: mps,
			},
		};
	});
};

/**
 * Insert multiple messages to the chat history
 */
const getLLMHistory = () => {
	const context = getChatContext();
	return convertChatHistoryForLLM(context.history);
};

// Chat request

const runJS = async (t: string, code: string): Promise<MsgPart> => {
	// Check if type has pipe
	const pp = parseMessagePartType(t);
	let outputType = 'result:run-js';
	if (pp.length > 1) {
		outputType = pp[1];
	}

	const jctx = getChatContext().jsContext;
	const result = await jctx.run(code);
	logr.info('[store/action] Run JS Result', result, code);
	return {
		type: outputType,
		content: result,
	};
};

const uaChromeVersions = [
	'134.0.0.0',
	'133.0.0.0',
	'132.0.0.0',
	'131.0.0.0',
	'130.0.0.0',
	'129.0.0.0',
	'128.0.0.0',
];
const uaSafariVersions = ['605.1.15', '537.36', '537.35', '536'];
const macVersions = ['10_15_7', '10_15_6', '10_14_3', '10_14_6'];

const userAgent = () => {
	const randomElement = (arr: string[]) =>
		arr[Math.floor(Math.random() * arr.length)];
	const chrome = randomElement(uaChromeVersions);
	const safari = randomElement(uaSafariVersions);
	const mac = randomElement(macVersions);
	return `Mozilla/5.0 (Macintosh; Intel Mac OS X ${mac}) AppleWebKit/${safari} (KHTML, like Gecko) Chrome/${chrome} Safari/${safari}`;
};

const fetchDocFromURL = async (
	url: string,
	onHTML: (doc: Document) => string | Promise<string>
): Promise<string> => {
	const tauriService = await getBEService();
	if (!tauriService) {
		return 'HTTP fetch error: not available';
	}

	try {
		const result = await tauriService.fetch('GET', url, [
			['Accept', 'text/html'],
			['User-Agent', userAgent()],
		]);
		if (result.status >= 400) {
			throw new Error(`Status ${result.status}, ${result.body}`);
		}

		// Check if the content is html
		const contentType = result.headers.find(
			([k]) => k.toLowerCase() === 'content-type'
		);
		if (!contentType || !contentType[1].includes('text/html')) {
			return result.body;
		}

		// Parse as html
		const parser = new DOMParser();
		const doc = parser.parseFromString(result.body, 'text/html');
		return await onHTML(doc);
	} catch (e) {
		logr.error(e);
		return 'HTTP fetch error: ' + e;
	}
};

const runSearchDDG = async (query: string): Promise<MsgPart> => {
	const onHTML = async (doc: Document) => {
		doc.querySelectorAll('style, input, select, script').forEach((el) =>
			el.remove()
		);
		const results = doc.querySelectorAll('div.filters');
		const resultHTML =
			results.length > 0 ? results[0].innerHTML : 'No results';
		// Remove unusuful whitespaces
		let md = turndownService.turndown(resultHTML);
		md = md.replace(/---+\s*/gm, '');
		md = md.replace(/\n\s+\n/g, '\n\n');
		md = md.replace(
			/\(\/\/duckduckgo\.com\/l\/\?uddg=([^&)]+)[^)]*\)/g,
			(_m, p1) => {
				return `(${decodeURIComponent(p1)})`;
			}
		);
		return md;
	};
	const content = await fetchDocFromURL(
		`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
		onHTML
	);
	return {
		type: 'result:search',
		content,
	};
};

const runSearchStartpage = async (query: string): Promise<MsgPart> => {
	const onHTML = async (doc: Document) => {
		doc.querySelectorAll(
			'noscript, style, script, link, meta, noscript, iframe, embed, object, svg'
		).forEach((el) => el.remove());
		// Remove unusuful whitespaces
		return doc.body.innerHTML.replace(/>\s+</g, '><');
	};
	const content = await fetchDocFromURL(
		`https://www.startpage.com/sp/search?q=${encodeURIComponent(query)}`,
		onHTML
	);
	return {
		type: 'result:search:startpage',
		content,
	};
};

const runVisit = async (url: string): Promise<MsgPart> => {
	const onHTML = async (doc: Document) => {
		doc.querySelectorAll(
			'style, script, link, meta, noscript, iframe, embed, object, svg'
		).forEach((el) => el.remove());
		doc.querySelectorAll('*').forEach((el) => {
			for (let i = 0; i < el.childNodes.length; i++) {
				const node = el.childNodes[i];
				if (node.nodeType === Node.COMMENT_NODE) {
					el.removeChild(node);
					i--;
				}
			}
			for (const attr of el.attributes) {
				if (
					attr.name.startsWith('on') ||
					attr.name.startsWith('data-')
				) {
					el.removeAttribute(attr.name);
				}
				el.removeAttribute('style');
			}
		});
		// Remove unusuful whitespaces
		return doc.body.innerHTML.replace(/>\s+</g, '><');
	};
	const content = await fetchDocFromURL(url, onHTML);
	return {
		type: 'result:visit',
		content,
	};
};

const handleSpecialPart = async (
	part: MsgPart
): Promise<MsgPart | undefined> => {
	switch (part.type) {
		case 'run-js':
			return await runJS(part.type, part.content);
		case 'search':
			return await runSearchDDG(part.content);
		case 'search:brave':
			return await runVisit(
				`https://search.brave.com/search?q=${encodeURI(part.content)}`
			);
		case 'search:startpage':
			return await runSearchStartpage(part.content);
		case 'visit':
			return await runVisit(part.content);
		default:
			return undefined;
	}
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
		await action.run(parts);
	} catch (e) {
		logr.error(e);
		toast.error('Failed to generate');
	}

	actions = actions.filter((a) => a !== action);
};

export const cancelAllChats = () => {
	actions.forEach((a) => a.cancel());
};
