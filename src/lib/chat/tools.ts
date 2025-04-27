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
			'Argument Error: Your arguments are invalid (missing arguments or wrong types). Please check again.\n' +
			result.errors.map((e) => e.stack).join('\n')
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
			'Use it for precise calculation, date processing, random, string manipulation, etc',
		].join('\n'),
		parameters: {
			type: 'object',
			properties: {
				code: {
					type: 'string',
					description:
						'The JavaScript code to be executed. Run in web worker. Use console to output.',
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
	'136.0.0.0',
	'135.0.0.0',
	'134.0.0.0',
	'133.0.0.0',
	'132.0.0.0',
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
	onHTML: (doc: Document) => string | Promise<string>,
	body?: BodyInit
): Promise<string> => {
	const beService = await getBEService();
	if (!beService) {
		return 'HTTP fetch error: not available';
	}

	try {
		let method = 'GET';
		const headers: [string, string][] = [
			['Accept', 'text/html'],
			['User-Agent', userAgent()],
		];
		if (body) {
			method = 'POST';
		}
		const result = await beService.rawFetch(url, {
			method,
			headers,
			body,
		});
		let respBody: string = await result.text();
		const contentType = result.headers.get('content-type') || 'text/plain';
		if (contentType && contentType.startsWith('text/html')) {
			try {
				respBody = await onHTML(
					new DOMParser().parseFromString(respBody, 'text/html')
				);
			} catch (e) {
				logr.error(e);
			}
		}

		if (result.status >= 400) {
			throw new Error(`Status ${result.status}, ${respBody}`);
		}

		return respBody;
	} catch (e) {
		logr.error(e);
		return 'HTTP fetch error: ' + e;
	}
};

addFunc(
	{
		name: 'webSearch',
		description: [
			'Search the given query from web search engine.',
			'If user request "search", "find", "invest", etc., you may used this function first.',
			'When you rephrase the result, show source. you should show link as markdown grammar. (e.g. [link](url))',
		].join('\n'),
		parameters: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'Search query or keywords',
					minLength: 1,
				},
				engine: {
					type: 'string',
					description:
						'Search engine name. If not specified, default is DuckDuckGo.',
					enum: ['duckduckgo', 'ddg', 'brave', 'bravesearch', 'bing'],
				},
				page: {
					type: 'number',
					description: 'Page number. Starts from 1. Default is 1.',
				},
			},
			required: ['query'],
		},
	},
	async ({
		query,
		engine,
		page,
	}: {
		query: string;
		engine?: string;
		page?: number;
	}) => {
		console.log('webSearch', query, engine, page);
		const search = async (engine: string): Promise<string> => {
			switch (engine.toLowerCase()) {
				case 'ddg':
				case 'duckduckgo': {
					const onHTML = async (doc: Document) => {
						doc.querySelectorAll(
							'style, input, select, script'
						).forEach((el) => el.remove());
						console.log(doc);
						const results = doc.querySelectorAll('.results_links');
						if (results.length === 0) {
							return '';
						}
						return Array.from(results)
							.map((node) => {
								const nodeA = node.querySelector('.result__a');
								const link = nodeA?.getAttribute('href') || '';
								const title = nodeA?.textContent || '';
								const abstract =
									node.querySelector('.result__snippet')
										?.textContent || '';
								return `## [${title}](${link})\n${abstract}`;
							})
							.join('\n\n');
					};
					return await fetchDocFromURL(
						`https://html.duckduckgo.com/html/`,
						onHTML,
						new URLSearchParams({
							q: query,
							df: 'y',
							s: '10',
							dc: `${1 + 10 * (page - 1)}`,
						})
					);
				}
				case 'bravesearch':
				case 'brave': {
					const onHTML = async (doc: Document) => {
						doc.querySelectorAll(
							'noscript, style, script, link, meta, noscript, iframe, embed, object, svg'
						).forEach((el) => el.remove());
						const results = doc.querySelectorAll(
							'#results > .snippet'
						);
						if (results.length === 0) {
							return '';
						}
						return Array.from(results)
							.map((node) => {
								return turndownService.turndown(node.innerHTML);
							})
							.join('\n\n');
					};
					const content = await fetchDocFromURL(
						`https://search.brave.com/search?q=${encodeURI(query)}&offset=${page - 1}`,
						onHTML
					);
					const out = turndownService.turndown(content);
					console.log(out);
					return out;
				}
				case 'bing': {
					const onHTML = async (doc: Document) => {
						const results = doc.querySelectorAll(
							'#b_results > li.b_algo'
						);
						if (results.length === 0) {
							return '';
						}
						return Array.from(results)
							.slice(0, 10)
							.map((node) => {
								const nodeA = node.querySelector('h2 > a');
								const link = nodeA?.getAttribute('href') || '';
								const title = nodeA?.textContent || '';
								const abstract =
									node.querySelector(
										'p[class^="b_lineclamp"]'
									)?.textContent || '';
								return `## [${title}](${link})\n${abstract}`;
							})
							.join('\n\n');
					};
					return await fetchDocFromURL(
						`https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${1 + 10 * (page - 1)}`,
						onHTML
					);
				}
				default:
					throw new Error(`Unsupported search engine: ${engine}`);
			}
		};
		if (!page) page = 1;
		if (page < 1) page = 1;
		if (engine) {
			return await search(engine);
		} else {
			// Fallback to default engines
			const engines = ['duckduckgo', 'brave', 'bing'];
			for (const e of engines) {
				try {
					const result = await search(e);
					if (result) {
						return result;
					}
				} catch {
					logr.warn(`Failed to search with ${e}`);
				}
			}
		}
		return 'Failed to search. Maybe search engine is not available temporarily.';
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
