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

export interface FunctionCallContent {
	type: 'function_call';
	id: string;
	name: string;
	args: string;
	result?: string;
}

/**
 * Typed content.
 */
export type TypedContent =
	| TextTypeContent
	| ImageURLTypeContent
	| FunctionCallContent;

export type LLMMsgContent = string | TypedContent[];

/**
 * Message for LLM.
 * Basically for OpenAI.
 */
export class LLMMessage {
	role: Role;
	content: LLMMsgContent;

	constructor(role: Role, content: LLMMsgContent) {
		this.role = role;
		this.content = content;
	}

	/**
	 * Create an assistant message.
	 */
	static assistant(content: LLMMsgContent): LLMMessage {
		return new LLMMessage('assistant', content);
	}

	/**
	 * Create a user message.
	 */
	static user(content: LLMMsgContent): LLMMessage {
		return new LLMMessage('user', content);
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

	/** Function calls */
	functionCalls(): FunctionCallContent[] {
		if (typeof this.content === 'string') {
			return [];
		}
		return this.content.filter((x) => x.type === 'function_call');
	}
}

export type LLMMessages = LLMMessage[];
