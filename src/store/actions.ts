// Store-based actions

import { getChatContext, getUserConfig, setChatContext } from './store';
import {
	chatHistoryToLLMHistory,
	emptyChatContext,
	MsgPart,
	parseMsgParts,
} from '../lib/chat';
import { newClientFromConfig, Role } from '../lib/llm';

export const newChat = () => {
	setChatContext(emptyChatContext());
};

const defaultSystemPrompt = `
You are a helpful assistant 'Unhurry'.

# Importants

- Description should be the same language as the user's request.
- Your answer should be correct markdown format (Allow inline latex).
- Answer in the following strategy:
  - First, enumerate the solution steps shortly. Each step may be using tool.
  - If you know the answer of step, describe them.
  - If it's hard to answer for LLM, use tools to calculate or demonstrate.
- For complex calculations, use 'run-js' actively. Finish answer at 'run-js' block, then wait for user message.

## Tools

You can use tools as markdown code block, with special language identifier.

### run-js

The system will execute the js in web-worker, and show the console outputs in the user message.

- You can use it to (1) calculate precise results, (2) demonstrate code execution, (3) generate intermediate date/results.
  - For exact calculation of number or string manipulation, must use 'run-js'.
- You can use await at top level.
- You can use most js standard library: console, Math, Date, BigInt, fetch, String, RegExp, Array, Map, Set, JSON, Intl, etc.
- The user will give the result in 'result-js' block.
  - DO NOT USE 'result-js' block in your message.

#### run-js Example

User: What is the sum of 1 to 10?

Assistant:
Let's calculate the sum of 1 to 10.
\`\`\`run-js
sum = 0;
for (let i = 1; i <= 10; i++) {
  sum += i;
}
console.log(sum);
\`\`\`

User:
\`\`\`result-js
55
\`\`\`

Assistant:
The sum of 1 to 10 is 55.

### result-js

SHOULD NOT USE 'result-js' block.
Only user can use 'result-js'.

### svg

The block will be rendered as image.
The conten should starts with <svg ...> and ends with </svg>.

#### mermaid

The block will be rendered visually.
You can use them to show image, plots, formulas, etc.

# Additional system prompts
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

	// Append user message to history
	insertMessage('user', parts);

	// Generate response
	const llmHistory = getLLMHistory();
	console.log('LLM Input', systemPrompt, llmHistory);
	const result = await llm.chat(systemPrompt, llmHistory);
	console.log('LLM Result', result);

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
