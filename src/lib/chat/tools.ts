import { Validator } from 'jsonschema';
import TurndownService from 'turndown';

import { getBEService } from '../be';
import { ToolConfigs } from '../config/tool';
import { FunctionTool } from '../llm/function';
import { logr } from '../logr';
import { JSContext } from '../run-js';

const turndownService = new TurndownService();
const jsonValidator = new Validator();

export const fnTools: FunctionTool[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Impl = (args: any) => Promise<string>;

export const fnImpls: Record<string, Impl> = {};

/**
 * Remove non-alphanumeric characters from the tool name and convert it to lowercase.
 */
export const normalizeToolName = (name: string) => {
	return name.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
};

export const getFnTools = (configs: ToolConfigs) => {
	return fnTools.filter((tool) => {
		const c = configs[tool.name];
		if (c?.disabled) return false;
		return true;
	});
};

const addFunc = (tool: FunctionTool, fn: Impl) => {
	fnTools.push(tool);
	fnImpls[normalizeToolName(tool.name)] = async (args) => {
		const result = jsonValidator.validate(args, tool.parameters);
		if (result.valid) return await fn(args);
		return (
			'Argument Error:\n' + result.errors.map((e) => e.stack).join('\n')
		);
	};
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
		const jsContext = new JSContext();
		const result = await jsContext.run(args.code);
		logr.info('[tool/runJS] Run Result', args.code, result);
		jsContext.terminateInstance();
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
		let body: string = result.body;
		const contentType = result.headers.find(
			([k]) => k.toLowerCase() === 'content-type'
		);
		if (contentType && contentType[1].startsWith('text/html')) {
			try {
				body = await onHTML(
					new DOMParser().parseFromString(body, 'text/html')
				);
			} catch (e) {
				logr.error(e);
			}
		}

		if (result.status >= 400) {
			throw new Error(`Status ${result.status}, ${body}`);
		}

		return body;
	} catch (e) {
		logr.error(e);
		return 'HTTP fetch error: ' + e;
	}
};

addFunc(
	{
		name: 'searchDuckDuckGo',
		description: [
			'Search the given query from DuckDuckGo web search engine. (Fast and precise)',
			'If user request "search", "find", "invest", etc., you may used this function first.',
			'When you rephrase the result, show source. you should show link as markdown grammar. (e.g. [link](url))',
		].join('\n'),
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'The search query.',
					minLength: 1,
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
		name: 'searchBrave',
		description: [
			'Search the given query from Brave web search engine.',
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
			`https://search.brave.com/search?q=${encodeURI(args.query)}`,
			onHTML
		);
		const out = turndownService.turndown(content);
		return out;
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
			const out = doc.body.innerHTML.replace(/>\s+</g, '><');
			const res = turndownService.turndown(out);
			return res;
		};

		let url = args.url;
		if (!url.startsWith('http://') && !url.startsWith('https://')) {
			url = 'https://' + url;
		}

		const content = await fetchDocFromURL(url, onHTML);
		return content;
	}
);
