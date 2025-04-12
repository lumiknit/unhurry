import { toast } from 'solid-toast';

import { SingleChatAction } from '../chat/action_chat';
import { ChatContext, ChatMeta, extractChatMeta } from '../chat/context';
import { MsgPair, MsgPart } from '../chat/structs';
import { chatListTx, chatTx, SimpleIDB } from '../idb';
import {
	BadRequestError,
	ModelConfig,
	RateLimitError,
	RequestEntityTooLargeError,
} from '../llm';
import { logr } from '../logr';
import { generateChatTitle } from './manager-utils';
import { ChatOptions, ChatRequest, OngoingChatMeta } from './structs';
import { uniqueID } from '../utils';

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
 * Chat manager state to saved in the IDB
 */
type ChatManagerState = {
	/** Fixed ID */
	_id: 'chat-manager';

	/** Updated timestamp */
	updatedAt: number;

	/** Current onging chat metadata */
	ongoings: OngoingChatMeta[];
};

const chatManagerIDB = new SimpleIDB('chat-manager', 'manager', 1);
const chatManagerTx = async () =>
	await chatManagerIDB.transaction<ChatManagerState>('readwrite');

/**
 * Managed chat.
 */
export type OngoingChat = {
	/**
	 * Metadata
	 */
	meta: OngoingChatMeta;

	ctx: ChatContext;

	opts: ChatOptions;

	lock?: boolean;

	/** Current onging chat action */
	action?: SingleChatAction;
};

/**
 * Chat manager is
 */
export class ChatManager {
	static instance: ChatManager | null = null;

	private checkInterval: number | null = null;
	private checkIntervalDelay = 1000;

	/**
	 * Watching contexts
	 */
	chats: Map<string, OngoingChat> = new Map();

	// Callbacks

	onProgressChange: (id: string, progress: boolean) => void = () => {};

	/**
	 * Callback for the chat context updated.
	 * It should return true if the context is applied for the UI.
	 */
	onContextUpdate: (ctx: ChatContext) => boolean = () => {
		return false;
	};

	/**
	 * Callback for the chat chunk is received.
	 */
	onChunk: (id: string, parts: MsgPart[], rest: string) => void = () => {};

	/**
	 * Callback for the chat completed and the message is given.
	 */
	onMessage: (id: string, msgPairs: MsgPair[]) => void = () => {};

	// Methods

	private constructor() {}

	static getInstance() {
		if (!this.instance) {
			this.instance = new ChatManager();
		}
		return this.instance;
	}

	// Utilities

	/**
	 * Get the chat by ID.
	 */
	chat(id: string): OngoingChat {
		const chat = this.chats.get(id);
		if (!chat) {
			throw new ChatNotFoundError(id);
		}
		return chat;
	}

	// State methods

	/**
	 * Save the current manager state to IDB
	 */
	async saveState() {
		const tx = await chatManagerTx();
		const state: ChatManagerState = {
			_id: 'chat-manager',
			updatedAt: Date.now(),
			ongoings: Array.from(this.chats.values()).map((c) => c.meta),
		};
		await tx.put(state);
	}

	/**
	 * Load the current manager state from IDB
	 */
	async loadState(opts: ChatOptions) {
		const tx = await chatManagerTx();
		const state = await tx.get('chat-manager');
		if (!state) {
			throw new Error('Chat manager state not found');
		}
		for (const c of state.ongoings) {
			if (this.chats.has(c.id)) {
				// Already loaded
				continue;
			}

			// Load the chat
			await this.loadChat(c.id, opts);

			// If request exissts, set it
			if (c.request) {
				this.setChatRequest(c.id, c.request);
			}
		}
		return state;
	}

	// Chat DB related methods

	private getEmptyChatCtx(): ChatContext {
		return {
			_id: uniqueID(),
			title: '',
			createdAt: Date.now(),
			updatedAt: Date.now(),
			history: {
				msgPairs: [],
			},
		};
	}

	private makeOngoing(ctx: ChatContext, options: ChatOptions) {
		const oc: OngoingChat = {
			meta: {
				id: ctx._id,
				startedAt: Date.now(),
			},
			ctx,
			opts: options,
		};
		this.chats.set(ctx._id, oc);
		this.saveState();
	}

	/**
	 * Load empty chat.
	 */
	emptyChat(options: ChatOptions): ChatContext {
		const ctx = this.getEmptyChatCtx();
		this.makeOngoing(ctx, options);
		return ctx;
	}

	/**
	 * Load the chat from the database.
	 * This will load the chat meta and all messages.
	 */
	async loadChat(id: string, options: ChatOptions): Promise<ChatContext> {
		if (this.chats.has(id)) {
			// Already loaded, just return the ID
			return this.chat(id).ctx;
		}

		const chatListDB = await chatListTx<ChatMeta>();
		const chatMeta = await chatListDB.get(id);
		if (!chatMeta) {
			return this.emptyChat(options);
		}
		const chatMsgDB = await chatTx<MsgPair>(id);
		const msgPairs = await chatMsgDB.getAll();

		const ctx: ChatContext = {
			...chatMeta,
			history: {
				msgPairs: msgPairs,
			},
		};
		this.makeOngoing(ctx, options);
		return ctx;
	}

	/**
	 * Unload the chat.
	 */
	async unloadChat(id: string) {
		//TODO: cancel the chat action then unload
		this.chats.delete(id);
		await this.saveState();
	}

	/**
	 * Save the chat metadata to the database.
	 */
	async saveChatMeta(id: string) {
		const ch = this.chat(id);
		const chatListDB = await chatListTx<ChatMeta>();
		ch.ctx.updatedAt = Date.now();
		if (this.onContextUpdate(ch.ctx)) {
			ch.ctx.checkedAt = Date.now();
		}
		const meta = extractChatMeta(ch.ctx);
		await chatListDB.put(meta);
	}

	/**
	 * Save new message
	 */
	async saveMessage(id: string, msgIdx: number) {
		const ch = this.chat(id);
		const chatDB = await chatTx<MsgPair>(id);
		const msg = ch.ctx.history.msgPairs[msgIdx];
		await chatDB.put({
			...msg,
			_id: msgIdx,
		});
	}

	// Chat methods

	/**
	 * Try to set the chat request.
	 * If the chat already has a request, it'll do nothing and return false.
	 */
	setChatRequest(id: string, req: ChatRequest): boolean {
		const ch = this.chat(id);
		if (ch.meta.request) {
			return false;
		}
		ch.meta.request = req;
		this.saveState();
		return true;
	}

	/**
	 * Try to set the chat options.
	 */
	setChatOpts(id: string, opts: Partial<ChatOptions>) {
		const ch = this.chat(id);
		ch.opts = {
			...ch.opts,
			...opts,
		};
		this.saveState();
	}

	// Utility methods

	isProgressing(id: string) {
		const ch = this.chat(id);
		return ch.action !== undefined;
	}

	/**
	 * Cancel the chat aciton.
	 */
	cancelChat(id: string) {
		const ch = this.chat(id);
		if (ch.action) {
			ch.action.cancel();
		}
	}

	updateChatMeta(id: string, meta: Partial<ChatMeta>) {
		const ch = this.chat(id);
		ch.ctx = {
			...ch.ctx,
			...meta,
		};
		this.saveChatMeta(id);
	}

	async generateChatTitle(id: string) {
		const ch = this.chat(id);
		const title = await generateChatTitle(ch.opts, ch.ctx.history);
		this.updateChatMeta(id, {
			title,
		});
	}

	// Callbacks for the chat actions

	private onLLMFallback(
		id: string,
		err: Error,
		_idx: number,
		mc: ModelConfig
	) {
		let reason = `'${mc.name}' failed. `;
		if (err instanceof BadRequestError) {
			reason +=
				'(400) Maybe the input is invalid, or some inputs are not supported. (e.g. Image, ToolCall)';
		} else if (err instanceof RequestEntityTooLargeError) {
			reason += '(413) Maybe chat history is too long.';
		} else if (err instanceof RateLimitError) {
			reason += '(429) Rate limit.';
		} else {
			reason += `(${err.message})`;
		}
		if (this.chats.get(id)?.opts.enableLLMFallback) {
			logr.info(
				`[ChatManager] LLM fallback enabled, error: ${err.message}; ${reason}`
			);
			return true;
		} else {
			logr.warn(
				`[ChatManager] LLM fallback disabled, error: ${err.message}; ${reason}`
			);
			return false;
		}
	}

	private callbackOnUpdate(id: string) {
		return async (idx: number) => {
			const ch = this.chats.get(id);
			if (!ch) {
				throw new Error(`Chat ${id} not found`);
			}

			this.onMessage(id, ch.ctx.history.msgPairs);

			// Save to DB
			await Promise.all([
				this.saveMessage(id, idx),
				this.saveChatMeta(id),
			]);
		};
	}

	private async checkChatInner(item: OngoingChat) {
		const id = item.meta.id;
		const req = item.meta.request;
		if (!req) {
			// No request, skip
			return;
		}

		const isFirst = item.ctx.history.msgPairs.length === 0;

		const action = new SingleChatAction(
			item.opts.modelConfigs,
			item.opts.toolConfigs,
			item.ctx.history
		);
		action.onChunk = (_, parts, rest) => this.onChunk(id, parts, rest);
		action.onLLMFallback = (err, index, mc) =>
			this.onLLMFallback(id, err, index, mc);
		action.onUpdate = this.callbackOnUpdate(item.meta.id);
		item.action = action;

		this.onProgressChange(id, true);

		let err: any = undefined;
		try {
			switch (req.type) {
				case 'user-msg':
					// Consume the message, then run the action
					await action.runWithUserMessage(req.message);
					item.meta.request = undefined;
					break;
				case 'uphurry':
					// TODO: Generate new message, then run
					break;
			}
		} catch (e) {
			err = e;
		}

		item.action = undefined;
		this.onProgressChange(id, false);

		if (err) {
			throw err;
		}

		if (isFirst) {
			// Generate the title
			const title = await generateChatTitle(item.opts, item.ctx.history);
			item.ctx.title = title;
			this.saveChatMeta(item.meta.id);
		}
	}

	/**
	 * Check the chat and run the action if needed.
	 */
	async checkChat(item: OngoingChat | string) {
		if (typeof item === 'string') {
			item = this.chat(item);
		}
		try {
			if (item.lock) {
				return;
			}
			item.lock = true;
			await this.checkChatInner(item);
		} catch (e) {
			logr.error('[ChatManager] Error checking chat', e);
			toast.error('ChatManager error: ' + item.ctx.title);
		}
		item.lock = false;
	}

	/**
	 * Periodic check for the chat
	 */
	private async checkAll() {
		await Promise.all(
			Array.from(this.chats.values()).map((item) => this.checkChat(item))
		);
	}

	/**
	 * Check if the chat manager is working.
	 * Return true if the check interval is set.
	 */
	isRunning() {
		return this.checkInterval !== null;
	}

	/**
	 * Start the chat manager.
	 */
	start() {
		if (this.checkInterval) {
			return;
		}
		this.checkInterval = window.setInterval(
			() => this.checkAll(),
			this.checkIntervalDelay
		);
	}

	/**
	 * Stop the chat manager.
	 */
	stop() {
		if (this.checkInterval) {
			window.clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}
}

export const chatManager = ChatManager.getInstance();
