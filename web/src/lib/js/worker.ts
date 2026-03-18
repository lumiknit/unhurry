import { JSWorkerMsg } from './worker_protocol';

export type CallResult = {
	value: unknown;
	consoleLines: string[];
};

export class CallError extends Error {
	consoleLines: string[];

	constructor(error: string, consoleLines: string[]) {
		super('JS Error: ' + error);
		this.name = 'CallError';
		this.consoleLines = consoleLines;
	}
}

type CallWaiter = {
	resolve: (value: CallResult) => void;
	reject: (err: CallError) => void;
};

/**
 * Javascript executer in separated worker
 */
export class JSWorker {
	private worker: Worker | null = null;
	private waiters: Map<string, CallWaiter> = new Map();

	open() {
		this.worker = new Worker(
			new URL('./worker_internal.ts', import.meta.url)
		);

		this.worker.addEventListener('message', this.handleMessage.bind(this));
		this.worker.addEventListener('error', this.handleError.bind(this));
	}

	terminate() {
		if (!this.worker) return;
		this.worker.terminate();
		this.worker.onerror = null;
		this.worker.onmessage = null;
		this.worker = null;
	}

	private handleMessage(event: MessageEvent) {
		console.log('Message from worker:', event.data);
		const msg: JSWorkerMsg = event.data;

		switch (msg.type) {
			case 'ret-call':
				{
					// Handle call return
					const waiter = this.waiters.get(msg.id);
					if (!waiter) {
						console.warn(
							`No waiter found for message ID: ${msg.id}`
						);
						return;
					}

					this.waiters.delete(msg.id);

					if (msg.error) {
						waiter.reject(
							new CallError(msg.error, msg.consoleLines)
						);
					} else {
						waiter.resolve({
							value: msg.retVal,
							consoleLines: msg.consoleLines,
						});
					}
				}
				break;

			default:
				console.warn(`Unknown message type from worker: ${msg.type}`);
		}
	}
	private handleError(event: ErrorEvent) {
		console.error(`Worker error: ${event.message}`);
		// Reject all pending calls on worker error
		this.waiters.forEach((waiter) => {
			waiter.reject(new CallError(`Worker error: ${event.message}`, []));
		});
		this.waiters.clear();
	}

	execute(code: string): Promise<CallResult> {
		if (!this.worker) {
			return Promise.reject(new Error('Worker is not initialized'));
		}

		const id = Math.random().toString(36).slice(2, 9); // Generate random ID
		const msg: JSWorkerMsg = {
			id,
			type: 'req-call',
			code,
		};

		return new Promise((resolve, reject) => {
			this.waiters.set(id, { resolve, reject });
			this.worker!.postMessage(msg);
		});
	}
}
