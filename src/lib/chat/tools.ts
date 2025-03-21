import TurndownService from 'turndown';

import { getBEService } from '../be';
import { FunctionTool } from '../llm/function';
import { JSContext } from '../run-js';

const turndownService = new TurndownService();
const jsContext = new JSContext();

export const fnTools: FunctionTool[] = [];
type Impl = (args: any) => Promise<string>;
export const fnImpls: Record<string, Impl> = {};

const addFunc = (tool: FunctionTool, fn: Impl) => {
	fnTools.push(tool);
	fnImpls[tool.name] = fn;
};

// Run JS
addFunc(
	{
		name: 'runJS',
		description: [
			'Execute the given JavaScript code in web worker.',
			'The result is the output of the code (console.log).',
			'When user request precise calculation, date processing, random, string manipulation, etc., you may use this function.',
		].join('\n'),
		parameters: {
			type: 'object',
			properties: {
				code: {
					type: 'string',
					description:
						'The JavaScript code to execute. Run in web worker. Use console to output.',
				},
			},
			required: ['code'],
		},
	},
	async (args: { code: string }) => {
		if (!args.code) {
			return 'Error: no code is provide. Please give `code` parameter.';
		}
		const result = await jsContext.run(args.code);
		console.log(args.code, result);
		return result;
	}
);

// WebSearch

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

addFunc(
	{
		name: 'search',
		description: [
			'Search the given query from DuckDuckGo web search engine.',
			'If user request "search", "find", "invest", etc., you may used this function first.',
			'When you rephrase the result, show source. you should show link as markdown grammar. (e.g. [link](url))',
		].join('\n'),
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'The search query.',
				},
			},
			required: ['query'],
		},
	},
	async (args: { query: string }) => {
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
		return await fetchDocFromURL(
			`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(args.query)}`,
			onHTML
		);
	}
);

addFunc(
	{
		name: 'searchStartpage',
		description: [
			'Search the given query from StartPage web search engine.',
			'The result is a HTML.',
			'When you rephrase the result, you should show link and image using markdown grammar. (e.g. [link](url), ![image](url))',
		].join('\n'),
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'The search query.',
				},
			},
			required: ['query'],
		},
	},
	async (args: { query: string }) => {
		const onHTML = async (doc: Document) => {
			doc.querySelectorAll(
				'noscript, style, script, link, meta, noscript, iframe, embed, object, svg'
			).forEach((el) => el.remove());
			// Remove unnecessary whitespaces
			return doc.body.innerHTML.replace(/>\s+</g, '><');
		};
		const content = await fetchDocFromURL(
			`https://www.startpage.com/sp/search?q=${encodeURIComponent(args.query)}`,
			onHTML
		);
		return content;
	}
);

addFunc(
	{
		name: 'visitWeb',
		description: [
			'Visit the given URL web page.',
			'If user request "visit", "open site", "go to link", etc., you may used this function first.',
			'The result is a HTML, removing unnecessary elements.',
			'When you rephrase the result, you should show link and image using markdown grammar. (e.g. [link](url), ![image](url))',
		].join('\n'),
		parameters: {
			type: 'object',
			properties: {
				url: {
					type: 'string',
					description: 'The URL to visit.',
				},
			},
			required: ['url'],
		},
	},
	async (args: { url: string }) => {
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
			// Remove unnecessary whitespaces
			return doc.body.innerHTML.replace(/>\s+</g, '><');
		};
		const content = await fetchDocFromURL(args.url, onHTML);
		return content;
	}
);
