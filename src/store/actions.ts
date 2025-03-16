// Store-based actions
import { toast } from 'solid-toast';
import TurndownService from 'turndown';

import {
	getChatContext,
	getUserConfig,
	setChatContext,
	setStreamingMessage,
} from './store';
import { systemPrompt } from './system_prompts';
import { getBEService } from '../lib/be';
import {
	chatHistoryToLLMHistory,
	emptyChatContext,
	MsgPart,
	parseMessagePartType,
	parseMsgParts,
} from '../lib/chat';
import { newClientFromConfig, Role, TextMessage } from '../lib/llm';

const turndownService = new TurndownService();

/**
 * Reset the chat context
 */
export const resetChatMessages = () => {
	setChatContext(emptyChatContext());
};

/**
 * Insert single message to the chat history
 */
const insertMessage = (role: Role, parts: MsgPart[]) => {
	setChatContext((c) => ({
		...c,
		history: {
			messages: [
				...c.history.messages,
				{
					role,
					parts,
				},
			],
		},
	}));
};

/**
 * Insert multiple messages to the chat history
 */
const getLLMHistory = () => {
	const context = getChatContext();
	return chatHistoryToLLMHistory(context.history);
};

// Chat request

let chatCancelled = false;

export const sendUserRequest = async (request: string) => {
	chatCancelled = false;
	return await sendUserParts(parseMsgParts(request));
};

export const cancelRequest = () => {
	chatCancelled = true;
};

const runJS = async (t: string, code: string): Promise<MsgPart> => {
	// Check if type has pipe
	const pp = parseMessagePartType(t);
	let outputType = 'result:run-js';
	if (pp.length > 1) {
		outputType = pp[1];
	}

	const jctx = getChatContext().jsContext;
	const result = await jctx.run(code);
	console.log('Run JS Result', result, code);
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
		console.error(e);
		return 'HTTP fetch error: ' + e;
	}
};

const runSearchDDG = async (query: string): Promise<MsgPart> => {
	const onHTML = async (doc: Document) => {
		doc.querySelectorAll('style, input, select, script').forEach((el) =>
			el.remove()
		);
		const results = doc.querySelectorAll('.results');
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

const handleSpecialParts = async (parts: MsgPart[]): Promise<MsgPart[]> =>
	(await Promise.all(parts.map(handleSpecialPart))).filter(
		(p) => p !== undefined
	);

export const sendUserParts = async (parts: MsgPart[]): Promise<void> => {
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
	const additionalSystemPrompt = modelConfig.systemPrompt;

	const sys = await systemPrompt(additionalSystemPrompt);

	const userSpecialParts = await handleSpecialParts(parts);
	parts.push(...userSpecialParts);

	// Append user message to history
	insertMessage('user', parts);

	// Generate response
	const llmHistory = getLLMHistory();
	console.log('LLM Input', sys, llmHistory);
	let result: TextMessage;
	try {
		result = await llm.chatStream(sys, llmHistory, (_, acc) => {
			setStreamingMessage(acc);
			console.log(chatCancelled);
			return !chatCancelled;
		});
		console.log('LLM Result', result);
	} catch (e) {
		toast.error('LLM Error: ' + e);
		// Remove user last message
		setChatContext((c) => ({
			...c,
			history: {
				messages: c.history.messages.slice(0, -1),
			},
		}));
		return;
	}

	// Parse the response to parts
	const assistantParts = parseMsgParts(result.content);

	// Insert the response to history
	insertMessage('assistant', assistantParts);
	setStreamingMessage(undefined);

	if (chatCancelled) {
		return;
	}

	// Check run-js parts
	let userParts: MsgPart[] = [];
	if (getUserConfig()?.enableRunCode) {
		userParts = await handleSpecialParts(assistantParts);
	}

	if (userParts.length > 0) {
		// Resend
		return await sendUserParts(userParts);
	}
};
