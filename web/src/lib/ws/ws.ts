import { authenticate, getWebsocketEndpoint } from './auth';

export type WsStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export interface WsSessionHandler {
	onOpen?(): void;
	onMessage(data: Uint8Array): void;
	onClose?(): void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_PREFIX = '-s-';
const SESSION_PREFIX_BYTES = encoder.encode(SESSION_PREFIX);
const ONCE_PREFIX = '-1-';

function findByte(data: Uint8Array, byte: number, from = 0): number {
	for (let i = from; i < data.length; i++) {
		if (data[i] === byte) return i;
	}
	return -1;
}

// ── WsSession ────────────────────────────────────────────────────────────────

export class WsSession {
	private _active = false;

	constructor(
		private readonly _id: string,
		private readonly _conn: WsConnection,
		private readonly _handler: WsSessionHandler
	) {}

	get id(): string {
		return this._id;
	}
	get isActive(): boolean {
		return this._active;
	}

	/** Send raw bytes to the backend for this session (e.g. keyboard input). */
	send(data: string): void {
		const prefix = encoder.encode(`${SESSION_PREFIX}${this._id}\n`);
		const payload = encoder.encode(data);
		const msg = new Uint8Array(prefix.length + payload.length);
		msg.set(prefix);
		msg.set(payload, prefix.length);
		this._conn._sendBinary(msg);
	}

	/** Notify the backend of a PTY window size change. */
	resize(cols: number, rows: number): void {
		this._conn._sendControl('resize_session', {
			session_id: this._id,
			cols,
			rows,
		});
	}

	/** Close this session. */
	close(): void {
		this._conn._closeSession(this._id);
	}

	// ── Called by WsConnection ──────────────────────────────────────────────
	_notifyOpen(): void {
		this._active = true;
		this._handler.onOpen?.();
	}
	_notifyMessage(data: Uint8Array): void {
		this._handler.onMessage(data);
	}
	_notifyClose(): void {
		this._active = false;
		this._handler.onClose?.();
	}
}

// ── WsConnection ─────────────────────────────────────────────────────────────

type PendingCreation = {
	handler: WsSessionHandler;
	resolve: (s: WsSession) => void;
	reject: (e: Error) => void;
};

type PendingCall = {
	resolve: (data: unknown) => void;
	reject: (e: Error) => void;
};

class WsConnection {
	private ws: WebSocket | null = null;
	private _status: WsStatus = 'idle';
	private sessions = new Map<string, WsSession>();
	private pendingCreations = new Map<string, PendingCreation>();
	private pendingCalls = new Map<string, PendingCall>();

	onStatusChange?: (status: WsStatus) => void;

	getStatus(): WsStatus {
		return this._status;
	}

	private setStatus(s: WsStatus): void {
		this._status = s;
		this.onStatusChange?.(s);
	}

	// ── Lifecycle ────────────────────────────────────────────────────────────

	async connect(token?: string | null): Promise<boolean> {
		try {
			await authenticate(token);
		} catch {
			return false;
		}

		this.setStatus('connecting');
		const ws = new WebSocket(getWebsocketEndpoint());
		this.ws = ws;

		ws.onopen = () => this.setStatus('open');

		ws.onmessage = async (e: MessageEvent) => {
			let data: Uint8Array;
			if (e.data instanceof Blob) {
				data = new Uint8Array(await e.data.arrayBuffer());
			} else if (typeof e.data === 'string') {
				data = encoder.encode(e.data);
			} else {
				data = new Uint8Array(e.data as ArrayBuffer);
			}
			this._route(data);
		};

		ws.onclose = () => {
			this.setStatus('closed');
			this.ws = null;
			for (const [, s] of this.sessions) s._notifyClose();
			this.sessions.clear();
			for (const [, p] of this.pendingCreations)
				p.reject(new Error('connection closed'));
			this.pendingCreations.clear();
			for (const [, p] of this.pendingCalls)
				p.reject(new Error('connection closed'));
			this.pendingCalls.clear();
		};

		ws.onerror = () => this.setStatus('error');

		return true;
	}

	disconnect(): void {
		this.ws?.close();
		this.ws = null;
	}

	// ── Sessions ─────────────────────────────────────────────────────────────

	/**
	 * Request a new multiplexed session from the backend.
	 * Sends "new_session_<purpose>" and resolves once the backend confirms.
	 */
	createSession(
		purpose: string,
		handler: WsSessionHandler,
		payload?: unknown
	): Promise<WsSession> {
		return new Promise((resolve, reject) => {
			const correlationId = crypto.randomUUID();
			this.pendingCreations.set(correlationId, {
				handler,
				resolve,
				reject,
			});
			const body: Record<string, unknown> = {
				correlation_id: correlationId,
			};
			if (payload !== undefined) body.payload = payload;
			this._sendControl(`new_session_${purpose}`, body);
		});
	}

	_closeSession(sessionId: string): void {
		const s = this.sessions.get(sessionId);
		if (!s) return;
		this.sessions.delete(sessionId);
		s._notifyClose();
		this._sendControl('close_session', { session_id: sessionId });
	}

	// ── Once calls ───────────────────────────────────────────────────────────

	/**
	 * Send a once (-1-) request and return a Promise that resolves with the
	 * response payload or rejects on error.
	 */
	call<Req, Resp>(type: string, payload: Req): Promise<Resp> {
		return new Promise((resolve, reject) => {
			const callId = crypto.randomUUID();
			this.pendingCalls.set(callId, {
				resolve: resolve as (data: unknown) => void,
				reject,
			});
			const body = JSON.stringify(payload);
			this.ws?.send(`${ONCE_PREFIX}${callId}\n${type}\n${body}`);
		});
	}

	// ── Transport ────────────────────────────────────────────────────────────

	_sendBinary(data: Uint8Array): void {
		this.ws?.send(data);
	}

	_sendControl(type: string, payload: unknown): void {
		this.ws?.send(`${type}\n${JSON.stringify(payload)}`);
	}

	// ── Routing ──────────────────────────────────────────────────────────────

	private _route(data: Uint8Array): void {
		const text = decoder.decode(data);

		// Once response: starts with "-1-"
		if (text.startsWith(ONCE_PREFIX)) {
			this._routeOnce(text);
			return;
		}

		// Session data: starts with "-s-" bytes
		if (data.length > SESSION_PREFIX_BYTES.length) {
			let isSession = true;
			for (let i = 0; i < SESSION_PREFIX_BYTES.length; i++) {
				if (data[i] !== SESSION_PREFIX_BYTES[i]) {
					isSession = false;
					break;
				}
			}
			if (isSession) {
				const nlIdx = findByte(data, 0x0a, SESSION_PREFIX_BYTES.length);
				if (nlIdx < 0) return;
				const sessionId = decoder.decode(
					data.slice(SESSION_PREFIX_BYTES.length, nlIdx)
				);
				const payload = data.slice(nlIdx + 1);
				this.sessions.get(sessionId)?._notifyMessage(payload);
				return;
			}
		}

		// Control message: "<type>\n<json>"
		const nlIdx = text.indexOf('\n');
		const type = nlIdx >= 0 ? text.slice(0, nlIdx) : text;
		const payload = nlIdx >= 0 ? text.slice(nlIdx + 1) : '';
		this._handleControl(type, payload);
	}

	private _routeOnce(text: string): void {
		// "-1-<callId>\n<type>\n<body>"
		const rest = text.slice(ONCE_PREFIX.length);
		const nl1 = rest.indexOf('\n');
		if (nl1 < 0) return;
		const callId = rest.slice(0, nl1);

		const rest2 = rest.slice(nl1 + 1);
		const nl2 = rest2.indexOf('\n');
		if (nl2 < 0) return;
		const type = rest2.slice(0, nl2);
		const body = rest2.slice(nl2 + 1);

		const pending = this.pendingCalls.get(callId);
		if (!pending) return;
		this.pendingCalls.delete(callId);

		if (type === 'err') {
			const errData = JSON.parse(body) as { message: string };
			pending.reject(new Error(errData.message));
		} else {
			pending.resolve(JSON.parse(body));
		}
	}

	private _handleControl(type: string, payload: string): void {
		switch (type) {
			case 'pong':
				break;

			case 'session_created': {
				const data = JSON.parse(payload) as {
					session_id: string;
					purpose: string;
					correlation_id: string;
				};
				const pending = this.pendingCreations.get(data.correlation_id);
				if (!pending) return;
				this.pendingCreations.delete(data.correlation_id);
				const session = new WsSession(
					data.session_id,
					this,
					pending.handler
				);
				this.sessions.set(data.session_id, session);
				session._notifyOpen();
				pending.resolve(session);
				break;
			}

			case 'session_closed': {
				const data = JSON.parse(payload) as { session_id: string };
				const session = this.sessions.get(data.session_id);
				if (!session) return;
				this.sessions.delete(data.session_id);
				session._notifyClose();
				break;
			}

			default:
				console.warn('ws: unknown control message', type);
		}
	}
}

/** Singleton WebSocket connection shared across the app. */
export const wsConn = new WsConnection();
