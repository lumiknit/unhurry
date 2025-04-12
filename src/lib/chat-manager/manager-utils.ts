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
	logr.info('[ChatManager/utils] Generated Title', result);
	const list = result
		.extractText()
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l);
	// Return only last line
	return list[list.length - 1];
};
