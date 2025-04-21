import { ChatHistory, convertChatHistoryForLLM } from '../chat/structs';
import { LLMMessage, newClientFromConfig } from '../llm';
import { logr } from '../logr';
import { ChatOptions } from './structs';

export const generateChatTitle = async (
	opts: ChatOptions,
	history: ChatHistory
): Promise<string> => {
	const llm = newClientFromConfig(opts.modelConfigs[0]);
	const systemPrompt = `
You are a title generator.
Based on the following conversation, please generate a title for this chat.
- Language should be short and clear (At least 2 words, at most 10 words. Single sentence)
- Should be relevant to the conversation
- Use the most used language in the conversation
- DO NOT answer except the title. You ONLY give a title in plain text.
`.trim();

	const llmHistory = await convertChatHistoryForLLM(history);
	llmHistory.push(
		LLMMessage.user('[Give me a title for the above conversation]')
	);
	const result = await llm.chat(systemPrompt, llmHistory);
	logr.info('[ChatManager/utils] Generated Title', result.content);
	const list = result
		.extractText()
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l);
	// Return only last line
	return list[list.length - 1];
};

export const generateNextQuestion = async (
	opts: ChatOptions,
	history: ChatHistory,
	comment: string
): Promise<string | null> => {
	const llm = newClientFromConfig(opts.modelConfigs[0]);
	const systemPrompt = `
You are a conversation management agent, 'UpHurry'.
You have a mission/goal to achieve.
You should generate a next prompt which will be given to 'AI Assistant Unhurry'.

YOU MUST use the same language as the goal comment.

## Goal Achieved

If the goal is already achieved, just respond with <DONE>.

## Giving Next Question

If the goal is not achieved yet, you should find the next message which will be sent to AI Assistant.

- Your message should be like said as a human in casual sentences, since you are a agent for human.
- Your answer must be short and clear. (However, it can contain multiple sentences or examples.)
- 'Unhurry' can use useful tools, such as runJS (code execution), web search, etc.
  - When you think a tool is useful, you must suggest it.
  - Unhurry may not have precise knowledge, so you may recommend web search.
- If the next task is clear, just instruct to "Unhurry" to do it.
- If the next task is not clear, you may give a question for more information.
- Or recommend to use a tool for more information.

## Something Goes Wrong

If the conversation goes off topic, you should try to get back on track.
But if you think it's hard, just say '<DONE>' to stop the conversation.

# Current Goal
${comment}

# Current Conversation
`.trim();

	const llmHistory = await convertChatHistoryForLLM(history);
	llmHistory.push(
		LLMMessage.user(
			`# Goal\n${comment}\n\n# The next question (or <DONE>)?\n`
		)
	);
	const result = await llm.chat(systemPrompt, llmHistory);
	logr.info('[ChatManager/utils] Generated next question', result.content);
	const text = result.extractText().trim();
	if (text.toLowerCase() === '<done>') {
		return null;
	}
	return result.extractText().trim();
};
