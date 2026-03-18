// worker_interal.ts
// This code is executed in the worker thread.

import { JSWorkerMsg } from './worker_protocol';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// Listen for messages
self.addEventListener('message', async (event: MessageEvent) => {
	const msg: JSWorkerMsg = event.data;

	switch (msg.type) {
		case 'req-call':
			{
				// Handle call request
				const afnBody = msg.code;
				const fn = new AsyncFunction(afnBody);
				try {
					const ret = await fn();
					self.postMessage({
						id: msg.id,
						type: 'ret-call',
						retVal: ret,
						console: '', // TODO: Capture console output
						error: undefined,
					});
				} catch (error) {
					self.postMessage({
						id: msg.id,
						type: 'ret-call',
						retVal: undefined,
						console: '', // TODO: Capture console output
						error:
							error instanceof Error
								? error.message
								: String(error),
					});
				}
			}
			break;
		default:
			throw new Error(`Unknown message type for worker: ${msg.type}`);
	}
});
