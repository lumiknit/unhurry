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
export interface Message {
	role: Role;
	content: MessageContent;
}

export type LLMMessages = Message[];
