import { History, Message, Role } from '../llm';

export type MsgPartType = string;

// Special message part types

/**
 * MSG_PART_TYPE_TEXT is a just text, not markdown block.
 */
export const MSG_PART_TYPE_TEXT = '';

/**
 * MSG_PART_TYPE_THINK is a think block.
 */
export const MSG_PART_TYPE_THINK = 'think';

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
export type MsgPart = {
	type: string;
	content: string;
};

export const parseMessagePartType = (type: string): string[] => {
	return type.split('|').map((x) => x.trim());
};

/**
 * Chat message.
 */
export type Msg = {
	role: Role;
	parts: MsgPart[];
};

export type ChatHistory = {
	messages: Msg[];
};

export const textMsg = (role: Role, text: string): Msg => ({
	role,
	parts: [
		{
			type: MSG_PART_TYPE_TEXT,
			content: text,
		},
	],
});

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
export const msgToText = (msg: Msg): Message => ({
	role: msg.role,
	content: msg.parts.map(msgPartToText).join('\n\n'),
});

export const parseMsgParts = (text: string): MsgPart[] => {
	// Insert newline before text, to simple match
	text = '\n' + text.trim();
	const parts: MsgPart[] = [];
	// Check if the answer starts with <Think> tag
	if (text.startsWith('\n<think>')) {
		const thinkEnd = text.indexOf('\n</think>');
		if (thinkEnd >= 0) {
			parts.push({
				type: MSG_PART_TYPE_THINK,
				content: text.slice(8, thinkEnd).trim(),
			});
			text = text.slice(thinkEnd + 9);
		}
	}

	for (let i = 0; i < text.length; ) {
		const blockStart = text.indexOf('\n```', i);
		if (blockStart < 0) {
			// The rest is text
			parts.push({
				type: MSG_PART_TYPE_TEXT,
				content: text.slice(i).trim(),
			});
			break;
		}

		let blockStartLineEnd = text.indexOf('\n', blockStart + 4);
		if (blockStartLineEnd < 0) blockStartLineEnd = text.length;

		let blockEnd = text.indexOf('\n```', blockStart + 1);
		if (blockEnd < 0) blockEnd = text.length;

		const prevBlockContent = text.slice(i, blockStart).trim();
		if (prevBlockContent.length > 0) {
			parts.push({
				type: MSG_PART_TYPE_TEXT,
				content: prevBlockContent,
			});
		}

		const blockType = text.slice(blockStart + 4, blockStartLineEnd).trim();
		const blockContent = text.slice(blockStartLineEnd + 1, blockEnd).trim();
		parts.push({
			type: blockType,
			content: blockContent,
		});

		i = blockEnd + 4;
	}

	return parts;
};

export const chatHistoryToLLMHistory = (history: ChatHistory): History => {
	return history.messages.map(msgToText);
};
