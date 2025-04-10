/* eslint @typescript-eslint/no-explicit-any: off */

// Loop for wait for the worker to finish

import { Message } from './messages';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
sleep(0);

(() => {
	const globalContext = {};

	type LogLevel = 'info' | 'warn' | 'error';

	class Console {
		fullText = '';

		private flushText(_level: LogLevel, text: string) {
			postMessage({
				type: '<text-out',
				text,
			});
			this.fullText += text;
		}

		private logWithLevel(level: LogLevel, ...args: any[]) {
			const texts = [];
			for (const arg of args) {
				if (arg instanceof Error) {
					texts.push(
						`Error (${arg.name}): ${arg.message}: ${arg.stack}`
					);
				} else if (typeof arg === 'string') {
					texts.push(arg);
				} else {
					let s = '';
					try {
						s = JSON.stringify(arg);
					} catch {
						s = String(arg);
					}
					texts.push(s);
				}
			}
			this.flushText(level, texts.join(' ') + '\n');
		}

		log(...args: any[]) {
			return this.logWithLevel('info', ...args);
		}

		debug(...args: any[]) {
			return this.logWithLevel('info', ...args);
		}

		warn(...args: any[]) {
			return this.logWithLevel('warn', ...args);
		}

		error(...args: any[]) {
			return this.logWithLevel('error', ...args);
		}

		assert(condition: any, ...args: any[]) {
			if (!condition) {
				this.error('Assertion failed:', ...args);
			}
		}
	}

	Console.toString = () => 'function Console() { [native code] }';

	self.onmessage = async (e) => {
		const msg = e.data as Message;
		switch (msg.type) {
			case '>run':
				{
					console.log('[Worker] Received run message');
					const code = msg.code;
					const con = new Console();

					try {
						console.log('[Worker] Creating a function from code');
						const fn = new AsyncFunction('$', 'console', code);
						console.log('[Worker] Executing the function');
						await fn(globalContext, con);
						console.log('[Worker] Function executed');
					} catch (e) {
						console.error('[Worker] Error while executing code', e);
						con.error(e);
					}
					self.postMessage({
						type: '<run',
						output: con.fullText,
					});
				}
				break;
			default:
				throw new Error(`Unknown message type: ${msg.type}`);
		}
	};

	console.log('Workers ready');
})();
