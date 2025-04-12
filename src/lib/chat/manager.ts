import { ToolConfigs } from "../config/tool";
import { ModelConfig } from "../llm";
import { ChatContext } from "./context";

export interface OngoingChat {
	ctx: ChatContext;

	modelConfig: ModelConfig[];

	toolConfigs: ToolConfigs;
}

/**
 * Chat manager is
 */
export class ChatManager {
	static instance: ChatManager | null = null;

	/**
	 * Watching contexts
	 */
	chats: Map<string, OngoingChat> = new Map();

	private constructor() {}

	static getInstance() {
		if (!this.instance) {
			this.instance = new ChatManager();
		}
		return this.instance;
	}

	private saveChat(id: string) {
		const ch = this.chats.get(id);
		if (!ch) {
			throw new Error(`Chat ${id} not found`);
		}
	}

	startChat(
		id: string,
	)

	focusChat(id: string) {
		throw new Error("Not implemented");
	}

	cancelChat(id: string) {
		throw new Error("Not implemented");
	}
};

export const chatManager = ChatManager.getInstance();


