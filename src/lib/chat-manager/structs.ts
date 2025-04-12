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

export type ChatProgress = {
	progressing: boolean;
};

export const emptyChatProgress = (): ChatProgress => ({
	progressing: false,
});
