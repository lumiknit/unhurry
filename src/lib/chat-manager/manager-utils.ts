import { ChatHistory, convertChatHistoryForLLM } from '../chat/structs';
import { LLMMessage, LLMMessages, newClientFromConfig } from '../llm';
import { ChatOptions } from './structs';

export type UtilChatOpts<Result> = {
	systemPrompt: string;
	historyProcess?: (h: LLMMessages) => Promise<LLMMessages>;
	postProcess: (msg: LLMMessage) => Promise<Result>;
};

export const utilChat = async <Result>(
	opts: ChatOptions,
	history: ChatHistory,
	uopts: UtilChatOpts<Result>
): Promise<Result> => {
	const llm = newClientFromConfig(opts.modelConfigs[0]);
	let lh = await convertChatHistoryForLLM(history);
	if (uopts.historyProcess) {
		lh = await uopts.historyProcess(lh);
	}
	const result = await llm.chat(uopts.systemPrompt, lh);
	return await uopts.postProcess(result);
};

/**
 * Generate a title for the chat
 */
export const genChatTitle = async (
	opts: ChatOptions,
	history: ChatHistory
): Promise<string> =>
	utilChat(opts, history, {
		systemPrompt: `
You are a title generator.
Based on the following conversation, please generate a title for this chat.
- Language should be short and clear (At least 2 words, at most 10 words. Single sentence)
- Should be relevant to the conversation
- Use the most used language in the conversation
- DO NOT answer except the title. You ONLY give a title in plain text.
`.trim(),
		historyProcess: async (h: LLMMessages) => {
			h.push(
				LLMMessage.user('[Give me a title for the above conversation]')
			);
			return h;
		},
		postProcess: async (msg: LLMMessage) =>
			msg
				.extractText()
				.split('\n')
				.map((l) => l.trim())
				.filter((l) => l)
				.pop() || '',
	});

/**
 * Generate a next question for the Chat
 */
export const genNextQuestion = async (
	opts: ChatOptions,
	history: ChatHistory,
	comment: string
): Promise<string | null> =>
	utilChat(opts, history, {
		systemPrompt: `
You are a conversation management agent, 'UpHurry'.
You should achieve a mission/goal for user, by asking to other LLM.
You should generate a next prompt which will be given to the AI Assistant 'Unhurry'.

YOU MUST use the same language as the goal comment.

## Goal Achieved

If the chat history includes everything for the goal,
the goal is achieved and just responsd as <DONE>.

## Giving Next Question

If the goal is not achieved yet, you should find the next message which will be sent to AI Assistant.

- You MUST say as a human in casual sentences, since you are a agent for human.
- Give a short instruction / question. About 1-2 sentences.
- You may give a guide to encourage AI (e.g. use xxx tools, think step by step)
- 'Unhurry' can use useful tools, such as runJS (code execution), web search, etc.
  - When you think a tool is useful, you must suggest it.
  - Unhurry may not have precise knowledge, so you may recommend web search.
- If the next task is clear, just instruct to "Unhurry" to do it.
- If the next task is not clear, you should give a question to derive the solution.
- If AI requested you to decide something, you MUST decide to the best way to achieve goal.
  (Or request more options).

## Something Goes Wrong

If the conversation goes off topic, you should try to get back on track.
But if you think it's hard, just say '<DONE>' to stop the conversation.

# Current Goal
${comment}

# Current Conversation
`.trim(),
		historyProcess: async (h: LLMMessages) => {
			h.push(
				LLMMessage.user(
					`# Goal\n${comment}\n\n# The next question (or <DONE>)?\n`
				)
			);
			return h;
		},
		postProcess: async (msg: LLMMessage) => {
			const text = msg.extractText().trim();
			if (text.toLowerCase() === '<done>') {
				return null;
			}
			return text;
		},
	});

/**
 * Compact the chat history
 */
export const genCompactHistory = async (
	opts: ChatOptions,
	history: ChatHistory
): Promise<string> =>
	utilChat(opts, history, {
		systemPrompt: `
You are a conversation agent.
You should read the previous chat history, and generate a summary report which should be remembered.
When user give '[COMPACT]', then generate a note for you.

- The summary should be short (about 5~10 sentences)
- You should keep all information so the LLM can be talk with user only with the note not full chat history
- You may keep the flow of the conversation (e.g., which user asked and how you answered, then what is request and which tools are used.)
- You may omit unimportant things, but keep the topic, keywords, which tool used and the result.
- You may keep result / example (e.g. if there are 5 example you gave, at least one should be kept)
- You can use English, but keywords / topic should be the same language.
`.trim(),
		historyProcess: async (h: LLMMessages) => {
			h.push(LLMMessage.user('[COMPACT]'));
			return h;
		},
		postProcess: async (msg: LLMMessage) => msg.extractText(),
	});
