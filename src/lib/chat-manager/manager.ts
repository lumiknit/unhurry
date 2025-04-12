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
import {
	ChatOptions,
	ChatRequest,
	emptyFocusedChatState,
	FocusedChatState,
	OngoingChatMeta,
} from './structs';

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

	focused?: string;

	// Callbacks

	/**
	 * Callback when the focused chat state is changed.
	 * This will be called when the
	 */
	onFocusedChatState: (state: FocusedChatState) => void = () => {};

	/**
	 * Callback for the chat chunk is received.
	 */
	onChunk: (parts: MsgPart[], rest: string) => void = () => {};

	/**
	 * Callback for the chat completed and the message is given.
	 */
	onMessage: (msgPairs: MsgPair[]) => void = () => {};

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
		let chatMeta = await chatListDB.get(id);
		let msgPairs: MsgPair[] = [];

		if (!chatMeta) {
			// Chat meta not found, create a new one.
			chatMeta = {
				_id: id,
				title: '',
				createdAt: Date.now(),
				updatedAt: Date.now(),
			};
		} else {
			const chatMsgDB = await chatTx<MsgPair>(id);
			msgPairs = await chatMsgDB.getAll();
		}

		const ctx: ChatContext = {
			...chatMeta,
			history: {
				msgPairs: msgPairs,
			},
		};

		const oc: OngoingChat = {
			meta: {
				id,
				startedAt: chatMeta.createdAt,
			},
			ctx,
			opts: options,
		};
		this.chats.set(id, oc);

		this.saveState();

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
		if (this.focused === id) {
			ch.ctx.checkedAt = Date.now();
		}
		const meta = extractChatMeta(ch.ctx);
		console.log('Save meta', meta);
		await chatListDB.put(meta);
		console.log('Saved meta');
	}

	/**
	 * Save new message
	 */
	async saveMessage(id: string, msgIdx: number) {
		console.log('Save message');
		const ch = this.chat(id);
		const chatDB = await chatTx<MsgPair>(id);
		const msg = ch.ctx.history.msgPairs[msgIdx];
		console.log('PUT', id, msg);
		await chatDB.put({
			...msg,
			_id: msgIdx,
		});
	}

	// Chat state

	private sendFocusedChatState() {
		try {
			const ch = this.chat(this.focused!);
			this.onFocusedChatState({
				progressing: ch.action !== undefined,
			});
		} catch {
			this.onFocusedChatState(emptyFocusedChatState());
		}
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

	/** Update focus and check the chat */
	focusAndCheck(id: string) {
		const ch = this.chat(id);
		this.focused = id;
		this.sendFocusedChatState();

		this.checkChatWrap(ch);
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

	// Callbacks for the chat actions

	private callbackOnChunk(id: string) {
		return async (_chunk: string, parts: MsgPart[], rest: string) => {
			if (id !== this.focused) {
				return;
			}
			this.onChunk(parts, rest);
		};
	}

	private callbackOnLLMFallback(id: string) {
		return (err: Error, _idx: number, mc: ModelConfig): boolean => {
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
				if (id === this.focused) {
					toast(`${reason} Trying another model...`);
				}
				logr.info(
					`[ChatManager] LLM fallback enabled, error: ${err.message}`
				);
				return true;
			} else {
				if (id === this.focused) {
					toast.error(reason);
					logr.warn(
						`[ChatManager] LLM fallback disabled, error: ${err.message}`
					);
				}
				return false;
			}
		};
	}

	private callbackOnUpdate(id: string) {
		return async (idx: number) => {
			const ch = this.chats.get(id);
			if (!ch) {
				throw new Error(`Chat ${id} not found`);
			}

			if (id === this.focused) {
				// TODO: Update global store
				this.onMessage(ch.ctx.history.msgPairs);
			}

			// Save to DB
			await Promise.all([
				this.saveMessage(id, idx),
				this.saveChatMeta(id),
			]);
		};
	}

	private async checkChat(item: OngoingChat) {
		const req = item.meta.request;
		if (!req) {
			// No request, skip
			return;
		}

		const action = new SingleChatAction(
			item.opts.modelConfigs,
			item.opts.toolConfigs,
			item.ctx.history
		);
		action.onChunk = this.callbackOnChunk(item.meta.id);
		action.onLLMFallback = this.callbackOnLLMFallback(item.meta.id);
		action.onUpdate = this.callbackOnUpdate(item.meta.id);
		item.action = action;

		this.sendFocusedChatState();

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

		item.action = undefined;

		this.sendFocusedChatState();
	}

	private async checkChatWrap(item: OngoingChat) {
		try {
			if (item.lock) {
				return;
			}
			item.lock = true;
			await this.checkChat(item);
		} catch (e) {
			logr.error('[ChatManager] Error checking chat', e);
			toast.error('ChatManager error: ' + item.ctx.title);
		}
		item.lock = false;
	}

	/**
	 * Periodic check for the chat
	 */
	private async check() {
		await Promise.all(
			Array.from(this.chats.values()).map((item) =>
				this.checkChatWrap(item)
			)
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
			() => this.check(),
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
