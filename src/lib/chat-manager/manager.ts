import { toast } from 'solid-toast';

import { getMemoryConfig } from '@/store/config';

import { SingleChatAction } from '../chat/action_chat';
import {
	ChatContext,
	ChatMeta,
	extractChatMeta,
	hasChatUpdate,
} from '../chat/context';
import { MsgConverter } from '../chat/converter';
import {
	assistantMsg,
	ChatHistory,
	MsgPair,
	MsgPart,
	userMsg,
} from '../chat/structs';
import { chatListTx, chatTx, SimpleIDB } from '../idb';
import {
	BadRequestError,
	ModelConfig,
	RateLimitError,
	RequestEntityTooLargeError,
} from '../llm';
import { logr } from '../logr';
import {
	extractMemoryDiff,
	genChatTitle,
	genCompactHistory,
	genNextQuestion,
} from './manager-utils';
import {
	ChatAlreadyProcessingError,
	ChatNotFoundError,
	ChatOptions,
	ChatRequest,
	OngoingChatMeta,
	OngoingChatSummary,
} from './structs';
import { uniqueID } from '../utils';

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

type ChatProgress = {
	llm: boolean;
	uphurry: boolean;
};

/**
 * Managed chat.
 */
type OngoingChat = {
	/**
	 * Metadata
	 */
	meta: OngoingChatMeta;

	ctx: ChatContext;

	opts: ChatOptions;

	/**
	 * ProcessingLock.
	 * If true, some task (chat / uphurry / gen title / compact) is running
	 */
	processing?: boolean;

	checkingLock?: boolean;

	/** Current onging chat action */
	action?: SingleChatAction;

	/** Max retries */
	retries: number;

	/** Warnings */
	warnings: string[];
};

/**
 * Chat manager is
 */
export class ChatManager {
	static instance: ChatManager | null = null;

	private checkInterval: number | null = null;
	private checkIntervalDelay = 5000;
	private maxRetries = 10;

	/**
	 * Watching contexts
	 */
	chats: Map<string, OngoingChat> = new Map();

	// Callbacks

	onChatProcessingChange: (id: string, progress: boolean) => void = () => {};

	onUphurryProgressChange: (id: string, progress: boolean) => void = () => {};

	/**
	 * Callback for the chat context updated.
	 * It should return true if the context is applied for the UI.
	 */
	onContextUpdate: (ctx: ChatContext) => boolean = () => {
		return false;
	};

	/**
	 * Callback for when warning is received.
	 */
	onWarning: (id: string, warnings: string[]) => void = () => {};

	/**
	 * Callback for the chat chunk is received.
	 */
	onChunk: (id: string, parts: MsgPart[], rest: string) => void = () => {};

	/**
	 * Callback for the chat completed and the message is given.
	 */
	onMessage: (id: string, msgPairs: MsgPair[]) => void = () => {};

	/**
	 * Callback when the chat is finished.
	 */
	onFinish: (id: string, ctx: ChatContext) => void = () => {};

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
	private chat(id: string): OngoingChat {
		const chat = this.chats.get(id);
		if (!chat) {
			throw new ChatNotFoundError(id);
		}
		return chat;
	}

	/**
	 *
	 */
	private tryLock(ch: OngoingChat) {
		if (ch.processing) {
			throw new ChatAlreadyProcessingError(ch.meta.id);
		}
		ch.processing = true;
		this.onChatProcessingChange(ch.meta.id, true);
	}

	private unlock(ch: OngoingChat) {
		ch.processing = false;
		this.onChatProcessingChange(ch.meta.id, false);
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
			retries: 0,
			warnings: [],
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

		if (hasChatUpdate(ctx)) {
			// Mark as checked
			ctx.checkedAt = Date.now();
			this.saveChatMeta(id);
		}
		return ctx;
	}

	/**
	 * Unload the chat.
	 */
	async unloadChat(id: string) {
		this.cancelChat(id);
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
	 * Save new message in DB.
	 * This does not trigger
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

	/**
	 * Clear all contents from DB
	 */
	async clearMessagesDB(id: string) {
		this.chat(id);
		const chatDB = await chatTx<MsgPair>(id);
		await chatDB.clear();
	}

	// Warning / retries

	private pushWarning(id: string, ...warnings: string[]) {
		const ch = this.chat(id);
		ch.warnings.push(...warnings);
		this.onWarning(id, ch.warnings);
	}

	private clearWarnings(id: string) {
		const ch = this.chat(id);
		if (ch.warnings.length > 0) {
			ch.warnings = [];
			this.onWarning(id, ch.warnings);
		}
	}

	private resetFailures(id: string) {
		const ch = this.chat(id);
		ch.retries = 0;
		this.clearWarnings(id);
		this.saveState();
	}

	// Chat methods

	/**
	 * Try to set the chat request.
	 * If the chat already has a request, it'll do nothing and return false.
	 */
	setChatRequest(id: string, req: ChatRequest): boolean {
		const ch = this.chat(id);
		this.tryLock(ch);
		ch.meta.request = req;
		this.resetFailures(id);
		this.saveState();

		this.checkChat(ch).catch(() => {});
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

	getProgress(id: string): ChatProgress {
		const ch = this.chat(id);
		return {
			llm: ch.action !== undefined,
			uphurry: ch.meta.request?.type === 'uphurry',
		};
	}

	/**
	 * Close the request.
	 */
	finishRequest(id: string) {
		const ch = this.chat(id);
		if (ch.meta.request) {
			ch.meta.request = undefined;
			this.unlock(ch);
			this.saveChatMeta(id);
			this.onFinish(id, ch.ctx);
		}
	}

	/**
	 * Cancel the chat aciton.
	 */
	cancelChat(id: string) {
		const ch = this.chat(id);
		if (ch.action) {
			ch.action.cancel();
		}
		ch.meta.request = undefined;
		this.unlock(ch);
		this.saveChatMeta(id);
	}

	updateChatMeta(id: string, meta: Partial<ChatMeta>) {
		const ch = this.chat(id);
		ch.ctx = {
			...ch.ctx,
			...meta,
		};
		this.saveChatMeta(id);
	}

	getOngoings(): OngoingChatSummary[] {
		return Array.from(this.chats.values()).map((item) => ({
			meta: item.meta,
			ctx: item.ctx,
			progressing: item.meta.request !== undefined || !!item.processing,
		}));
	}

	// Utils

	async generateChatTitle(id: string) {
		const ch = this.chat(id);
		this.tryLock(ch);
		try {
			const title = await genChatTitle(ch.opts, ch.ctx.history);
			this.updateChatMeta(id, {
				title,
			});
		} finally {
			this.unlock(ch);
		}
	}

	async compactChat(id: string, toClear?: boolean) {
		const ch = this.chat(id);

		this.tryLock(ch);
		try {
			const compacted = await genCompactHistory(ch.opts, ch.ctx.history);

			if (toClear) {
				await this.clearMessagesDB(id);
				// Clear chat history
				ch.ctx.history.msgPairs = [];
			}

			ch.ctx.history.msgPairs.push({
				user: userMsg(
					`# Note\nOld messages are clipped, the below is summary of the last chat:\n${compacted}`
				),
				assistant: assistantMsg('OK.'),
			});

			this.onMessage(id, ch.ctx.history.msgPairs);

			// Save to DB
			await Promise.all([
				this.saveMessage(id, ch.ctx.history.msgPairs.length - 1),
				this.saveChatMeta(id),
			]);
		} finally {
			this.unlock(ch);
		}
	}

	// Callbacks for the chat actions

	private onLLMFallback(
		id: string,
		err: Error,
		_idx: number,
		mc: ModelConfig
	) {
		const ch = this.chat(id);
		let reason = `<${mc.name}> error.`;
		if (err instanceof BadRequestError) {
			reason +=
				'(400) Maybe inputs are invalid or include unsupported items. (e.g. Image, ToolCall)';
		} else if (err instanceof RequestEntityTooLargeError) {
			reason += '(413) Maybe chat history is too long.';
		} else if (err instanceof RateLimitError) {
			reason += '(429) Rate limit.';
		} else {
			reason += `(${err.message})`;
		}
		reason += `(retries: ${ch.retries})`;

		this.pushWarning(id, reason);

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
			const ch = this.chat(id);

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
		if (isFirst) {
			this.saveChatMeta(id);
		}

		const createAction = () => {
			const action = new SingleChatAction(
				item.opts.modelConfigs,
				item.opts.toolConfigs,
				item.ctx.history
			);
			action.onStart = () => {
				this.clearWarnings(id);
			};
			action.onChunk = (_, parts, rest) => this.onChunk(id, parts, rest);
			action.onLLMFallback = (err, index, mc) =>
				this.onLLMFallback(id, err, index, mc);
			action.onUpdate = this.callbackOnUpdate(item.meta.id);
			item.action = action;
			return action;
		};

		try {
			switch (req.type) {
				case 'user-msg':
					if (getMemoryConfig()?.enabled) {
						const his: ChatHistory = {
							msgPairs: [
								...item.ctx.history.msgPairs,
								{
									user: {
										role: 'user',
										parts: req.message,
										timestamp: Date.now(),
									},
								},
							],
						};
						extractMemoryDiff(item.opts, his);
					}
					// Consume the message, then run the action
					await createAction().runWithUserMessage(req.message);
					this.finishRequest(id);
					break;
				case 'uphurry':
					{
						this.onUphurryProgressChange(id, true);
						const nextQuestion = await genNextQuestion(
							item.opts,
							item.ctx.history,
							req.comment
						);
						this.onUphurryProgressChange(id, false);
						if (nextQuestion === null) {
							this.finishRequest(id);
						} else {
							await createAction().runWithUserMessage(
								MsgConverter.parse(nextQuestion),
								{ uphurry: true }
							);
						}
					}
					break;
			}
		} finally {
			item.action = undefined;
			this.onUphurryProgressChange(id, false);
		}

		if (isFirst) {
			// Generate the title
			const title = await genChatTitle(item.opts, item.ctx.history);
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
		if (item.checkingLock || item.retries > this.maxRetries) {
			return;
		}
		item.checkingLock = true;
		try {
			await this.checkChatInner(item);
			this.resetFailures(item.ctx._id);
		} catch (e) {
			item.retries = (item.retries || 0) + 1;
			if (item.retries > this.maxRetries) {
				const title = item.ctx.title || 'untitled';
				logr.error('[ChatManager] Error checking chat', e);
				toast.error(`[chat '${title}'] ${e}`);
				this.cancelChat(item.meta.id);
			}
		}
		item.checkingLock = false;
	}

	/**
	 * Periodic check for the chat
	 */
	private checkAll() {
		for (const c of this.chats.values()) {
			this.checkChat(c).catch(() => {});
		}
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
