// Store-based actions
import { toast } from 'solid-toast';
import TurndownService from 'turndown';

import {
	getChatContext,
	getUserConfig,
	setChatContext,
	setStreamingMessage,
} from './store';
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

const defaultSystemPrompt = `
You are a helpful assistant 'Unhurry'.

# Important Guidelines

- The description should match the user's request language.
- Ensure your answer is in correct Markdown format.
  - Show math formulas in LaTeX format with Dollor signs (e.g. $\\frac{x}{y}$ or $$y=x$$). (Not \`\\(...\\)\` or \`\\[...\\]\`)
- **Simple Tasks** (e.g., summary, translation, format conversion. What LLM can do): Provide short, straightforward answers without extra explanations.
- **Complex Questions** (e.g. precise computation, code running, draw image or diagram): Follow this strategy:
  1. **Enumerate Steps**: List the solution steps briefly.
  2. **Describe Known Answers**: If you know the answer to any step, explain it.
  3. **Use Tools for Difficult Questions**: Utilize tools for calculations or demonstrations.
- Use tools actively to solve complex questions.
- If you know reference link, use markdown link format (e.g. [link text](url)).
- If you know image link, use markdown image format (e.g. ![alt text](url)) to show the image in the chat.

## Tools

- You can invoke special tools to help you solve the problem.
- Tools are invoked by using code blocks with special language identifiers. (e.g., \`\`\`run-js, \`\`\`search, \`\`\`visit)
- Tools block **SHOULD NOT be indented**.
- You SHOULD NOT write the result block (starts with result:). The system will automatically make the result block in the user message.
  - You should answer the question based on the tool's result.
- If you put pipe (|) after the tool name, you can change the output format of result block
  - e.g. For json output, 'run-js|json', for svg output, 'run-js|svg', etc.
  - You don't need to repeat the result, since user will obtain the result immediately.
- When tool result is given, describe the result and use tools (either same one or different one) if it's useful.
- You can use multiple tools in a single message.

#### search

Search the query in duckduckgo.

- Put search query in '\`\`\`search' ... '\`\`\`' block.
- The result block contains the search result in markdown format.
- Whenever you lack information, use the search tool to find the answer.

#### search:startpage, search:brave

- Use other web search service. If search is not availabe use it.
- Put search query in '\`\`\`search:SERVICE' ... '\`\`\`' block.

#### visit

Visit the URL and get the HTML content.
When user say 'show', 'go to' or 'enter', you can also use this tool.
When user need information, and you know link, use it.

- Put the URL in '\`\`\`visit' ... '\`\`\`' block.
- The result block may contain the body HTML of the page.

You may use link ([text](url)) or image (![alt](url)) to show result effectively.

### run-js

The system will execute the js in web-worker, and show the console outputs in the user message.

- **Purpose**: Execute JavaScript in a web worker for:
  1. Precise calculations (math, string manipulation, etc.)
  2. Code demonstrations
  3. Generating intermediate data/results
- **For EVERY async call, MUST use \`await\`**.
- The code will be run in a web worker. You cannot use neither node API nor require/import.
- Most JS standard library available: console, Math, Date, BigInt, fetch, String, RegExp, Array, Map, Set, JSON, Intl, etc.
- The global variables are shared between different 'run-js' blocks. You can reuse them.

#### run-js Example

\`\`\`run-js
sum = 0;
for (let i = 1; i <= 10; i++) {
  sum += i;
}
console.log(sum);
\`\`\`

### svg

- Content should start with \`<svg ...>\` and end with \`</svg>\`. Use this block for images or graphs.
- Ensure to use \`viewBox\` instead of \`width\` and \`height\`.

#### mermaid

- Use this block to visually represent images, plots, formulas, etc.

## Additional Guidelines

### run-pseudo

When user gave 'run-pseudo' block, you should rewrite them in 'run-js' block, with correct JavaScript syntax.

# Additional info
`.trim();

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

export const sendUserRequest = async (request: string) => {
	return await sendUserParts(parseMsgParts(request));
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

const runSearchDDG = async (query: string): Promise<MsgPart> => {
	const tauriService = await getTauriService();
	if (!tauriService) {
		return {
			type: 'result:search',
			content: 'Search is not available',
		};
	}

	const htmlDDG = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
	try {
		const result = await tauriService.fetch('GET', htmlDDG, [
			['Accept', 'text/html'],
			['User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'],
		]);
		if (result.status !== 200) {
			throw new Error(`Status ${result.status}, ${result.body}`);
		}
		const body = result.body;
		// Parse as html
		const parser = new DOMParser();
		const doc = parser.parseFromString(body, 'text/html');
		console.log('DOC', doc);
		const results = doc.querySelectorAll('.serp__results');
		const resultHTML =
			results.length > 0 ? results[0].innerHTML : 'No results';
		// Remove unusuful whitespaces
		let md = turndownService.turndown(resultHTML);
		md = md.replace(/---+\s*/gm, '');
		md = md.replace(/\(\/\/duckduckgo\.com\/l\/\?uddg=([^&)]+)[^)]*\)/g, (_m, p1) => {
			return `(${decodeURIComponent(p1)})`;
		});

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
		const result = await tauriService.fetch('GET', url);
		if (result.status !== 200) {
			throw new Error(`Status ${result.status}, ${result.body}`);
		}
		const body = result.body;
		// Parse as html
		const parser = new DOMParser();
		const doc = parser.parseFromString(body, 'text/html');
		// Remove styles, script tags
		const elementsToRemove = doc.querySelectorAll('style, script, link, meta, noscript, iframe, embed, object');
		elementsToRemove.forEach((el) => el.remove());
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

	const systemPrompt =
		defaultSystemPrompt +
		(additionalSystemPrompt ? '\n\n' + additionalSystemPrompt : '') +
		'\n- Current time: ' + (new Date()).toLocaleString();


	for (const part of parts) {
		const pp = parseMessagePartType(part.type);
		switch (pp[0]) {
			case 'run-js':
				parts.push(await runJS(part.type, part.content));
				break;
			case 'search':
				parts.push(await runSearchDDG(part.content));
				break;
			case 'search:brave':
				parts.push(await runVisit(`https://search.brave.com/search?source=web&q=${encodeURI(part.content)}`));
				break;
			case 'search:startpage':
				parts.push(await runVisit(`https://www.startpage.com/sp/search?q=${encodeURI(part.content)}`));
				break;
			case 'visit':
				parts.push(await runVisit(part.content));
				break;
		}
	}

	// Append user message to history
	insertMessage('user', parts);

	// Generate response
	const llmHistory = getLLMHistory();
	console.log('LLM Input', systemPrompt, llmHistory);
	let result: TextMessage;
	try {
		result = await llm.chatStream(systemPrompt, llmHistory, (_, acc) => {
			setStreamingMessage(acc);
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

	// Check run-js parts
	const userParts = [];
	if (getUserConfig()?.enableRunCode) {
		for (const part of assistantParts) {
			const pp = parseMessagePartType(part.type);
			switch (pp[0]) {
				case 'run-js':
					userParts.push(await runJS(part.type, part.content));
					break;
				case 'search':
					userParts.push(await runSearchDDG(part.content));
					break;
				case 'search:brave':
					userParts.push(await runVisit(`https://search.brave.com/search?source=web&q=${encodeURI(part.content)}`));
					break;
				case 'search:startpage':
					userParts.push(await runVisit(`https://www.startpage.com/sp/search?q=${encodeURI(part.content)}`));
					break;
				case 'visit':
					userParts.push(await runVisit(part.content));
					break;
			}
		}
	}

	if (userParts.length > 0) {
		// Resend
		return await sendUserParts(userParts);
	}
};
