// Store-based actions
import toast from 'solid-toast';

import { getChatContext, getUserConfig, setChatContext } from './store';
import {
	chatHistoryToLLMHistory,
	emptyChatContext,
	MsgPart,
	parseMsgParts,
} from '../lib/chat';
import { newClientFromConfig, Role, TextMessage } from '../lib/llm';

export const newChat = () => {
	setChatContext(emptyChatContext());
};

const defaultSystemPrompt = `
You are a helpful assistant 'Unhurry'.

# Important Guidelines

- The description should match the user's request language.
- Ensure your answer is in correct Markdown format.
  - Use math formulas in LaTeX with dollars (e.g. $\\frac{x}{y}$ or $$y=x$$). (Not \`\\(...\\)\` or \`\\[...\\]\`)
- **Simple Tasks** (e.g., summary, translation, format conversion. What LLM can do): Provide short, straightforward answers without extra explanations.
- **Complex Questions** (e.g. precise computation, code running, draw image or diagram): Follow this strategy:
  1. **Enumerate Steps**: List the solution steps briefly.
  2. **Describe Known Answers**: If you know the answer to any step, explain it.
  3. **Use Tools for Difficult Questions**: Utilize tools for calculations or demonstrations.
- Actively use 'run-js' for precise results. Conclude your answer with the 'run-js' block and wait for the user's response.

## Tools

- Markdown code block with special langauge identifier are considered as tool call.
- Tools block **SHOULD NOT be indented**.

### run-js

The system will execute the js in web-worker, and show the console outputs in the user message.

- **Purpose**: Execute JavaScript in a web worker for:
  1. Precise calculations (math, string manipulation, etc.)
  2. Code demonstrations
  3. Generating intermediate data/results
- For every async function call at top level, you must use 'await'.
- Most JS standard library available: console, Math, Date, BigInt, fetch, String, RegExp, Array, Map, Set, JSON, Intl, etc.
- The user will give the result in 'result-js' block.
  - **DO NOT USE 'result-js' block in yourself.**

#### run-js Example

The following is an example chat using 'run-js' block.

**User**: What is the sum of 1 to 10?

**Assistant**: Let's calculate the sum of 1 to 10.
\`\`\`run-js
sum = 0;
for (let i = 1; i <= 10; i++) {
  sum += i;
}
console.log(sum);
\`\`\`

**User**:
\`\`\`result-js
55
\`\`\`

**Assistant**: The sum of 1 to 10 is **55**.

### result-js

When you give 'run-js' block, the user will put the outputs in the 'result-js' block automatically.

### svg

- Content should start with \`<svg ...>\` and end with \`</svg>\`. Use this block for images or graphs.
- Ensure to use \`viewBox\` instead of \`width\` and \`height\`.

#### mermaid

- Use this block to visually represent images, plots, formulas, etc.

# Additional System Prompts
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
		(additionalSystemPrompt ? '\n\n' + additionalSystemPrompt : '');

	for (const part of parts) {
		const jctx = getChatContext().jsContext;
		console.log('Part', part);

		if (part.type === 'run-js') {
			// Run js
			const result = await jctx.run(part.content);
			console.log('Run JS Result', result, part.content);
			const resultPart: MsgPart = {
				type: 'result-js',
				content: result,
			};
			parts.push(resultPart);
		}
	}

	// Append user message to history
	insertMessage('user', parts);

	// Generate response
	const llmHistory = getLLMHistory();
	console.log('LLM Input', systemPrompt, llmHistory);
	let result: TextMessage;
	try {
		result = await llm.chat(systemPrompt, llmHistory);
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

	// Check run-js parts
	const userParts = [];
	for (const part of assistantParts) {
		const jctx = getChatContext().jsContext;
		console.log('Part', part);

		if (part.type === 'run-js') {
			// Run js
			const result = await jctx.run(part.content);
			console.log('Run JS Result', result, part.content);
			const resultPart: MsgPart = {
				type: 'result-js',
				content: result,
			};
			userParts.push(resultPart);
		}
	}
	if (userParts.length > 0) {
		// Resend
		return await sendUserParts(userParts);
	}
};
