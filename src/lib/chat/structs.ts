import { getFile, getFileDataURL } from '../idb/file_storage';
import { LLMMessages, LLMMessage, Role, TypedContent } from '../llm';

/*
 * Message parts.
 * Message parts are used to represent the various types of content
 * that can be included in a message.
 *
 * The message parts has 'type' and 'content', both are strings.
 * The 'type' is used to identify the kind of content.
 * The 'content' is the actual content.
 *
 * Empty type '' is used for plain text, which will be shown as markdown.
 * All other types may be safe to be shown as markdown code blocks.
 *
 * Some special types may be displayed to the user in a special way.
 * - '*fn:call', '*fn:ret': LLM function calling
 * - '*think': Think block, which is used for reasoning model.
 * Asterisk prefix is used when the type is not a real markdown block.
 */

/**
 * Message part type.
 */
export type MsgPartType = string;

// Special message part types

/**
 * MSG_PART_TYPE_TEXT is a just text, not markdown block.
 */
export const MSG_PART_TYPE_TEXT = '';

/**
 * Function call.
 * The content type is FunctionCallInfo.
 */
export const MSG_PART_TYPE_FUNCTION_CALL = '*fn:call';

/**
 * MSG_PART_TYPE_FILE is a file.
 * The content type is ID, which is used for IndexedDB.
 */
export const MSG_PART_TYPE_FILE = '*file';

/**
 * MSG_PART_TYPE_THINK is a think block.
 */
export const MSG_PART_TYPE_THINK = '*think';

/**
 * Message part.
 */
export interface MsgPart {
	type: string;
	content: string;
}

export const parseMessagePartType = (type: string): string[] => {
	return type.split('|').map((x) => x.trim().toLowerCase());
};

/**
 * Chat message.
 */
export interface Msg<R = Role> {
	role: R;
	parts: MsgPart[];
	timestamp: number;
}

/**
 * Group of message pair, user than assistant (Order is important).
 * They are grouped for
 * - More convenient to display in UI
 */
export interface MsgPair {
	user?: Msg<'user'>;
	assistant?: Msg<'assistant'>;
}

export interface ChatHistory {
	msgPairs: MsgPair[];
}

/**
 * Convert MsgPart to string.
 * This can be used as an input of any LLM.
 */
export const msgPartToText = (msg: MsgPart): string => {
	switch (msg.type) {
		case MSG_PART_TYPE_TEXT:
			return msg.content;
		default:
			return `\`\`\`${msg.type}\n${msg.content}\n\`\`\``;
	}
};

/**
 * Convert Msg to string.
 * This can be used as an input of any LLM.
 */
export const convertMsgForLLM = async (msg: Msg): Promise<LLMMessage> => {
	const content: TypedContent[] = [];
	let textContent = '';
	for (const part of msg.parts) {
		switch (part.type) {
			case MSG_PART_TYPE_THINK:
				// Ignore for tokens
				break;
			case MSG_PART_TYPE_FILE:
				{
					const f = await getFile(part.content);
					if (f && f.mimeType.startsWith('image/')) {
						const dataURL = await getFileDataURL(part.content);
						if (dataURL) {
							content.push({
								type: 'image_url',
								image_url: { url: dataURL },
							});
						}
					}
				}
				break;
			case MSG_PART_TYPE_FUNCTION_CALL:
				{
					if (textContent) {
						content.push({ type: 'text', text: textContent });
						textContent = '';
					}
					content.push(JSON.parse(part.content));
				}
				break;
			default: {
				if (textContent) {
					textContent += '\n\n';
				}
				textContent += part.content;
			}
		}
	}
	if (content.length === 0) {
		return new LLMMessage(msg.role, textContent);
	}
	if (textContent) {
		content.push({ type: 'text', text: textContent });
	}
	return new LLMMessage(msg.role, content);
};

/**
 * Convert chat history to LLM message history.
 */
export const convertChatHistoryForLLM = async (
	history: ChatHistory
): Promise<LLMMessages> => {
	const messages: LLMMessages = [];
	for (const pair of history.msgPairs) {
		if (pair.user) {
			messages.push(await convertMsgForLLM(pair.user));
		}
		if (pair.assistant) {
			messages.push(await convertMsgForLLM(pair.assistant));
		}
	}
	return messages;
};
