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
 * - 'run-js': JavaScript code block
 * - 'svg: Show the SVG tag as an image
 * - 'mermaid': Show the Mermaid diagram
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

export const MSG_PART_TYPE_FUNCTION_CALL = '*fn:call';

/**
 * MSG_PART_TYPE_THINK is a think block.
 */
export const MSG_PART_TYPE_THINK = '*think';

/**
 * MSG_PART_TYPE_RUN_JS is a javascript code which should be executed.
 */
export const MSG_PART_TYPE_RUN_JS = 'run-js';

/**
 * MSG_PART_TYPE_SVG is a SVG image, which will be rendered.
 */
export const MSG_PART_TYPE_SVG = 'svg';

/**
 * MSG_PART_TYPE_MERMAID is a Mermaid diagram, which will be rendered.
 */
export const MSG_PART_TYPE_MERMAID = 'mermaid';

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
export const convertMsgForLLM = (msg: Msg): LLMMessage => {
	const content: TypedContent[] = [];
	let textContent = '';
	for (const part of msg.parts) {
		if (part.type === MSG_PART_TYPE_FUNCTION_CALL) {
			if (textContent) {
				content.push({ type: 'text', text: textContent });
				textContent = '';
			}
			content.push(JSON.parse(part.content));
		} else {
			if (textContent) {
				textContent += '\n\n';
			}
			textContent += part.content;
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
export const convertChatHistoryForLLM = (history: ChatHistory): LLMMessages => {
	return history.msgPairs.reduce<LLMMessages>((acc, pair) => {
		if (pair.user) {
			acc.push(convertMsgForLLM(pair.user));
		}
		if (pair.assistant) {
			acc.push(convertMsgForLLM(pair.assistant));
		}
		return acc;
	}, []);
};
