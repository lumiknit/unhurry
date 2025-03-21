/**
 * Role of a message.
 * Based on OpenAI.
 */
export type Role = 'system' | 'user' | 'assistant';

/**
 * Text-type content.
 */
export interface TextTypeContent {
	type: 'text';
	text: string;
}

/**
 * Image-type content.
 */
export interface ImageURLTypeContent {
	type: 'image_url';
	url: string;
}

/**
 * Typed content.
 */
export type TypedContent = TextTypeContent | ImageURLTypeContent;

export type MessageContent = string | TypedContent[];

/**
 * Message for LLM.
 * Basically for OpenAI.
 */
export class Message {
	role: Role;
	content: MessageContent;

	constructor(role: Role, content: MessageContent) {
		this.role = role;
		this.content = content;
	}

	/**
	 * Create an assistant message.
	 */
	static assistant(content: MessageContent): Message {
		return new Message('assistant', content);
	}

	/**
	 * Create a user message.
	 */
	static user(content: MessageContent): Message {
		return new Message('user', content);
	}

	/** Extract only text contents */
	extractText(): string {
		if (typeof this.content === 'string') {
			return this.content;
		}
		const t: string[] = [];
		for (const x of this.content) {
			if (x.type === 'text') {
				t.push(x.text);
			}
		}
		return t.join('\n\n');
	}
}

export type LLMMessages = Message[];
