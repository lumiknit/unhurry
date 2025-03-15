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
import {
	chatHistoryToLLMHistory,
	emptyChatContext,
	MsgPart,
	parseMessagePartType,
	parseMsgParts,
} from '../lib/chat';
import { newClientFromConfig, Role, TextMessage } from '../lib/llm';
import { getTauriService } from '../lib/tauri';

const turndownService = new TurndownService();

export const newChat = () => {
	setChatContext(emptyChatContext());
};

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

const getLLMHistory = () => {
	const context = getChatContext();
	return chatHistoryToLLMHistory(context.history);
};

let cancelled = false;

export const sendUserRequest = async (request: string) => {
	cancelled = false;
	return await sendUserParts(parseMsgParts(request));
};

export const cancelRequest = () => {
	cancelled = true;
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

const runSearchDDG = async (query: string): Promise<MsgPart> => {
	const tauriService = await getTauriService();
	if (!tauriService) {
		return {
			type: 'result:search',
			content: 'Search is not available',
		};
	}

	const htmlDDG = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
	try {
		const result = await tauriService.fetch('GET', htmlDDG, [
			['Accept', 'text/html'],
			['User-Agent', userAgent()],
		]);
		if (result.status !== 200) {
			throw new Error(`Status ${result.status}, ${result.body}`);
		}
		const body = result.body;
		// Parse as html
		const parser = new DOMParser();
		const doc = parser.parseFromString(body, 'text/html');
		doc.querySelectorAll('style, input, select, script').forEach((el) =>
			el.remove()
		);
		console.log('DOC', doc);
		const results = doc.querySelectorAll('.filters');
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

		return {
			type: 'result:search',
			content: md,
		};
	} catch (e) {
		console.error(e);
		return {
			type: 'result:search',
			content: 'Search failed: ' + e,
		};
	}
};

const runSearchStartpage = async (query: string): Promise<MsgPart> => {
	const tauriService = await getTauriService();
	if (!tauriService) {
		return {
			type: 'result:search',
			content: 'Search is not available',
		};
	}

	const url = `https://www.startpage.com/sp/search?q=${encodeURIComponent(query)}`;
	try {
		const result = await tauriService.fetch('GET', url, [
			['Accept', 'text/html'],
			['User-Agent', userAgent()],
		]);
		if (result.status !== 200) {
			throw new Error(`Status ${result.status}, ${result.body}`);
		}
		const body = result.body;
		// Parse as html
		const parser = new DOMParser();
		const doc = parser.parseFromString(body, 'text/html');
		doc.querySelectorAll(
			'noscript, style, script, link, meta, noscript, iframe, embed, object, svg'
		).forEach((el) => el.remove());
		console.log('DOC', doc);
		// Remove unusuful whitespaces
		return {
			type: 'result:search',
			content: doc.body.innerHTML.replace(/>\s+</g, '><'),
		};
	} catch (e) {
		console.error(e);
		return {
			type: 'result:search:startpage',
			content: 'Search failed: ' + e,
		};
	}
};

const runVisit = async (url: string): Promise<MsgPart> => {
	const tauriService = await getTauriService();
	if (!tauriService) {
		return {
			type: 'result:visit',
			content: 'Visit is not available',
		};
	}

	try {
		// Try to parse the URL
		if (!url.startsWith('http://') && !url.startsWith('https://')) {
			url = 'http://' + url;
		}
		const result = await tauriService.fetch('GET', url, [
			['User-Agent', userAgent()],
		]);
		if (result.status !== 200) {
			throw new Error(`Status ${result.status}, ${result.body}`);
		}
		const body = result.body;
		// Parse as html
		const parser = new DOMParser();
		const doc = parser.parseFromString(body, 'text/html');
		// Remove styles, script tags
		const elementsToRemove = doc.querySelectorAll(
			'style, script, link, meta, noscript, iframe, embed, object, svg'
		);
		elementsToRemove.forEach((el) => el.remove());
		// Remove unusuful attributes
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
		return {
			type: 'result:visit',
			content: doc.body.innerHTML.replace(/>\s+</g, '><'),
		};
	} catch (e) {
		console.error(e);
		return {
			type: 'result:visit',
			content: 'Visit failed: ' + e,
		};
	}
};

const handleSpecialParts = async (parts: MsgPart[]): Promise<MsgPart[]> => {
	const newParts = [];
	for (const part of parts) {
		if (cancelled) continue;
		const pp = parseMessagePartType(part.type);
		switch (pp[0]) {
			case 'run-js':
				newParts.push(await runJS(part.type, part.content));
				break;
			case 'search':
				newParts.push(await runSearchDDG(part.content));
				break;
			case 'search:brave':
				newParts.push(
					await runVisit(
						`https://search.brave.com/search?q=${encodeURI(part.content)}`
					)
				);
				break;
			case 'search:startpage':
				newParts.push(await runSearchStartpage(part.content));
				break;
			case 'visit':
				newParts.push(await runVisit(part.content));
				break;
		}
	}
	return newParts;
};

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
			console.log(cancelled);
			return !cancelled;
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

	if (cancelled) {
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
