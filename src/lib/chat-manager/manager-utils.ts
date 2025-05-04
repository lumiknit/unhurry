import { getMemoryConfig, setMemoryConfig } from '@/store/config';

import { MsgConverter } from '../chat/converter';
import { ChatHistory } from '../chat/structs';
import { LLMMessage, LLMMessages, newClientFromConfig } from '../llm';
import { ChatOptions } from './structs';
import { applyMemoryDiff } from '../memory/config';

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
	const modelConfig = opts.modelConfigs[0];
	if (!modelConfig) {
		throw new Error('No model config');
	}
	const llm = newClientFromConfig(modelConfig);
	const parser = new MsgConverter(modelConfig);
	let lh = await parser.format(history);
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

/**
 * Extract memory diff
 */
export const extractMemoryDiff = async (
	opts: ChatOptions,
	history: ChatHistory
): Promise<string> =>
	utilChat(opts, history, {
		systemPrompt: `
You are a conversation helper.
You will read a conversation and memory.
You should generate changes of memory in diff format.

- You should find facts to remember / forget.
- Your answer should contain differences of memory.
  - Lines starting with '+' will be added to the memory.
  - Lines starting with '-' will be removed from the memory.
- For example, if 'USER have a pen, not a paper', but the old memory is 'USER has a paper', then you should answer as

\`\`\`example
- USER has a paper.
+ USER has a pen.
\`\`\`

- System will apply changes to the memory based on your answer.
- Each fact should be a short and clear single sentence.
- Facts can bb in English, but it's recommended to use original language for keywords.
- Use a word 'USER' to represent the user (counterpart), and 'AI' to represent YOU (AI Assistant, Unhurry).
- If nothing to change, just say 'No changes.'
- You do not need to keep all conversation to history. Find only important facts / personal information.
- DO NOT USE relative time format (e.g. today, 10 minutes ago, etc.). Use absolute time format and durations.

## Current Time

Current time is '${new Date().toLocaleString()}'.

For memory, you should use duration with absolute time format, instead of relative time format.

## Memory

The below is a memory you currently have.

\`\`\`memory
${getMemoryConfig()?.contents}
\`\`\`
`.trim(),
		historyProcess: async (h: LLMMessages) => {
			h.push(LLMMessage.assistant('[END OF CONVERSATION]'));
			h.push(LLMMessage.user('[GIVE MEMORY DIFF]'));
			console.log('History', h);
			return h;
		},
		postProcess: async (msg: LLMMessage) => {
			const oldC = getMemoryConfig();
			if (!oldC) return '';
			const newC = applyMemoryDiff(oldC, msg.extractText());
			setMemoryConfig(newC);
			console.log('Memory', oldC, msg, newC);
			return 'a';
		},
	});
