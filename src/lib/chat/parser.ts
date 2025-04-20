import { BLOCK_PREFIX_FN_CALL, FunctionCallContent } from '../llm';
import {
	MSG_PART_TYPE_FUNCTION_CALL,
	MSG_PART_TYPE_TEXT,
	MSG_PART_TYPE_THINK,
	MsgPart,
} from './structs';

/**
 * Message parts parser to support streaming.
 */
export class MsgPartsParser {
	private cursor = 0;
	buffer = '';
	parts: MsgPart[] = [
		{
			type: MSG_PART_TYPE_TEXT,
			content: '',
		},
	];

	/**
	 * Number of backticks for closing block
	 */
	quotes: number = 3;

	/**
	 * Full step parse.
	 */
	static parse(data: string): MsgPart[] {
		const parser = new MsgPartsParser();
		parser.push(data);
		parser.process();
		return parser.finish();
	}

	state(): [MsgPart[], string] {
		return [this.parts, this.buffer.slice(this.cursor)];
	}

	/**
	 * Push the data into buffer.
	 */
	push(data: string) {
		this.buffer += data;
		this.process();
	}

	/**
	 * Finish the buffer and return the parts.
	 */
	finish(): MsgPart[] {
		this.push('\n');
		const parts = this.parts.filter((p) => {
			return p.type !== MSG_PART_TYPE_TEXT || p.content.trim().length > 0;
		});
		return parts;
	}

	private checkCallPart(part: MsgPart): MsgPart {
		if (!part.type.startsWith(BLOCK_PREFIX_FN_CALL)) {
			return part;
		}

		// Parse call (*call:toolName(...))
		try {
			let callEnd = part.type.indexOf('(', BLOCK_PREFIX_FN_CALL.length);
			if (callEnd < 0) {
				callEnd = part.type.length;
			}
			const name = part.type.slice(BLOCK_PREFIX_FN_CALL.length, callEnd);

			const content: FunctionCallContent = {
				type: 'function_call',
				id: Math.random().toString(36).slice(2),
				name,
				args: part.content,
			};

			return {
				type: MSG_PART_TYPE_FUNCTION_CALL,
				content: JSON.stringify(content),
			};
		} catch {
			return part;
		}
	}

	/**
	 * Process.
	 * If there are new lines, push as the new line.
	 */
	process() {
		// Early return if no new lines
		let lineEnd = this.buffer.indexOf('\n', this.cursor);
		if (lineEnd < 0) {
			return;
		}

		let lastPart = this.parts.pop()!;
		do {
			let line = this.buffer.slice(this.cursor, lineEnd + 1);

			// Handle reasoning block
			if (
				lastPart.type === MSG_PART_TYPE_TEXT &&
				line.startsWith('<think>')
			) {
				this.parts.push(lastPart);
				lastPart = {
					type: MSG_PART_TYPE_THINK,
					content: '',
				};
				line = line.slice('<think>'.length);
			}
			if (
				lastPart.type === MSG_PART_TYPE_THINK &&
				line.startsWith('</think>')
			) {
				this.parts.push(lastPart);
				lastPart = {
					type: MSG_PART_TYPE_TEXT,
					content: '',
				};
				line = line.slice('</think>'.length);
			}

			// Handle code block
			const bt = line.match(/^```+/);
			if (bt !== null) {
				const backticks = bt[0].length;
				let blockType = line.slice(backticks).trim();

				if (lastPart.type === MSG_PART_TYPE_TEXT) {
					// Open the block
					if (!blockType) {
						blockType = 'plaintext';
					}
					this.quotes = backticks;
					this.parts.push(lastPart);
					lastPart = {
						type: blockType,
						content: '',
					};
					line = '';
				} else if (backticks >= this.quotes && !blockType) {
					// close the block
					this.parts.push(this.checkCallPart(lastPart));
					lastPart = {
						type: MSG_PART_TYPE_TEXT,
						content: '',
					};
					line = '';
				}
			}

			// Append the line to the last part
			lastPart.content += line;
			this.cursor = lineEnd + 1;

			lineEnd = this.buffer.indexOf('\n', this.cursor);
		} while (this.cursor < this.buffer.length && lineEnd >= 0);

		this.parts = [...this.parts, { ...lastPart }];
	}
}
