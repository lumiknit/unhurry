/**
 * Background JS Executor
 */

import { type Message, RunReqMsg } from './messages';

type LineCallback = (text: string) => void;

/**
 * JS Executor Context
 */
export class JSContext {
	/**
	 * Background js worker
	 */
	worker: Worker = null!;

	/**
	 * Is the worker running flag
	 */
	running: boolean = false;

	/**
	 * Resolve run promise.
	 * When the worker finishes, this promise will be resolved with the output.
	 */
	resolveRun: (v: string) => void = () => {};

	/**
	 * Line callback.
	 * When the worker sends some output lines, this callback will be called.
	 */
	lineCallback: LineCallback = () => {};

	constructor() {
		this.createInstance();
	}

	private onMessage(e: MessageEvent) {
		const d = e.data as Message;
		switch (d.type) {
			case '<text-out':
				{
					// Intermediate output.
					this.lineCallback(d.text);
				}
				break;

			case '<run': {
				this.running = false;
				this.resolveRun(d.output);
				console.log('<run', d);

				// Reset callbacks
				this.resolveRun = () => {};
				this.lineCallback = () => {};
				break;
			}
		}
	}

	createInstance() {
		this.worker = new Worker(new URL('./worker.ts', import.meta.url));
		this.worker.onmessage = this.onMessage.bind(this);
		this.worker.onerror = (e) => {
			console.error('Worker error', e);
		};
	}

	terminateInstance() {
		this.worker.terminate();
		this.resolveRun('');
		this.createInstance();
	}

	run(code: string, lineCallback?: LineCallback): Promise<string> {
		if (this.running) {
			throw new Error('Worker is already running');
		}

		const ev: RunReqMsg = {
			type: '>run',
			code,
		};

		this.lineCallback = lineCallback ?? (() => {});

		this.worker.postMessage(ev);

		return new Promise<string>((resolve) => {
			this.resolveRun = resolve;
		});
	}
}
