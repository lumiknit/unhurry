import {
	AssistantModelMessage,
	SystemModelMessage,
	ToolModelMessage,
	UserModelMessage,
} from 'ai';

import type { ThreadMessage } from '../thread/types';

type TargetMessage =
	| UserModelMessage
	| SystemModelMessage
	| AssistantModelMessage
	| ToolModelMessage;

/**
 * Converts a generic ThreadMessage into Vercel AI SDK CoreMessages.
 * Filters out hidden notes, commands, and translates normal user/assistant/tool messages.
 */
export function convertThreadMessageToCoreMessages(
	msg: ThreadMessage
): TargetMessage[] {
	switch (msg.type) {
		case 'user_text':
		case 'user_agentic':
			return [{ role: 'user', content: msg.text }];
		case 'user_image':
			// The ai SDK requires an image URL or buffer for `image` parts.
			// Assuming `imgPath` is a resolvable URL for the browser.
			return [
				{
					role: 'user',
					content: [
						{
							type: 'image',
							image: msg.imgPath,
						},
					],
				},
			];
		case 'ai_text':
			return [{ role: 'assistant', content: msg.text }];
		case 'ai_tool': {
			// A tool call usually consists of the assistant invoking a tool,
			// followed by a 'tool' role message containing the result.
			const msgs: TargetMessage[] = [
				{
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: msg.id,
							toolName: msg.name,
							input: msg.arg,
						},
					],
				},
			];
			if (msg.result) {
				msgs.push({
					role: 'tool',
					content: [
						{
							type: 'tool-result',
							toolCallId: msg.id,
							toolName: msg.name,
							output: {
								type: 'text',
								value: msg.result.result,
							},
						},
					],
				});
			}
			return msgs;
		}
		case 'agent_system':
		case 'compacted':
			return [{ role: 'system', content: msg.text }];

		// Ignored messages that are UI-only or not intended for the LLM context
		case 'user_command':
		case 'user_hidden':
		case 'system_noti':
		case 'ai_image':
		default:
			return [];
	}
}

/**
 * Converts an array of ThreadMessages to a linear array of Vercel CoreMessages.
 */
export function convertThreadMessagesToCoreMessages(
	messages: ThreadMessage[]
): TargetMessage[] {
	const out: TargetMessage[] = [];
	for (const msg of messages) {
		out.push(...convertThreadMessageToCoreMessages(msg));
	}
	return out;
}
