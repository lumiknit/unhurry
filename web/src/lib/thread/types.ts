import { JSONValue } from '../json';

export type MessageType =
	| 'user_text'
	| 'user_image'
	| 'user_command'
	| 'user_hidden'
	| 'user_agentic'
	| 'system_noti'
	| 'ai_text'
	| 'ai_image'
	| 'ai_tool'
	| 'agent_system'
	| 'compacted';

export interface BaseThreadMessage {
	id: string;
	type: MessageType;
}

export interface UserTextMessage extends BaseThreadMessage {
	type: 'user_text';
	text: string;
	rawText?: string;
}

export interface UserImageMessage extends BaseThreadMessage {
	type: 'user_image';
	imgPath: string;
}

export interface UserCommandMessage extends BaseThreadMessage {
	type: 'user_command';
	text: string;
}

export interface UserHiddenMessage extends BaseThreadMessage {
	type: 'user_hidden';
	text: string;
}

export interface UserAgenticMessage extends BaseThreadMessage {
	type: 'user_agentic';
	text: string;
}

export interface SystemNotiMessage extends BaseThreadMessage {
	type: 'system_noti';
	text: string;
}

export interface AITextMessage extends BaseThreadMessage {
	type: 'ai_text';
	text: string;
}

export interface AIImageMessage extends BaseThreadMessage {
	type: 'ai_image';
	imgPath: string;
}

export interface AIToolMessage extends BaseThreadMessage {
	type: 'ai_tool';
	name: string;
	arg: JSONValue;
	result?: {
		approved: boolean;
		result: string;
		meta?: JSONValue;
	};
}

export interface AgentSystemMessage extends BaseThreadMessage {
	type: 'agent_system';
	text: string;
}

export interface CompactedMessage extends BaseThreadMessage {
	type: 'compacted';
	text: string;
}

export type ThreadMessage =
	| UserTextMessage
	| UserImageMessage
	| UserCommandMessage
	| UserHiddenMessage
	| UserAgenticMessage
	| SystemNotiMessage
	| AITextMessage
	| AIImageMessage
	| AIToolMessage
	| AgentSystemMessage
	| CompactedMessage;

export interface ThreadSection {
	id: string;
	label: string;
	messages: ThreadMessage[];
}

export type Permission = {
	allowed: boolean;
	scope: string;
};

export interface Thread {
	id: string;
	title: string;
	host?: string;
	permissions: Permission[];
	sections: ThreadSection[];
}
