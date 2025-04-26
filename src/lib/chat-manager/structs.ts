import { ChatContext } from '../chat/context';
import { MsgPart } from '../chat/structs';
import { ToolConfigs } from '../config/tool';
import { ModelConfig } from '../llm';

export interface ChatOptions {
	modelConfigs: ModelConfig[];
	toolConfigs: ToolConfigs;
	enableLLMFallback: boolean;
}

export type ChatReqMsg = {
	type: 'user-msg';
	message: MsgPart[];
};

export type ChatReqUphurry = {
	type: 'uphurry';
	comment: string;
};

export type ChatRequest = ChatReqMsg | ChatReqUphurry;

/**
 * Managed chat metadata.
 * This will be stored in the database.
 */
export type OngoingChatMeta = {
	/** Chat ID */
	id: string;

	/** Started timestamp */
	startedAt: number;

	request?: ChatRequest;
};

/**
 * Ongoing chat summary
 */
export type OngoingChatSummary = {
	meta: OngoingChatMeta;

	ctx: ChatContext;

	progressing: boolean;
};

// Errors

/**
 * Chat not found error
 */
export class ChatNotFoundError extends Error {
	constructor(id: string) {
		super(`[ChatManager] Chat ${id} not found`);
		this.name = 'ChatNotFoundError';
	}
}

/**
 * Chat already processing other task error
 */
export class ChatAlreadyProcessingError extends Error {
	constructor(id: string) {
		super(`[ChatManager] Chat ${id} is already processing`);
		this.name = 'ChatAlreadyProcessingError';
	}
}
