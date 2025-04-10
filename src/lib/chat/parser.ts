import { FunctionCallContent } from '../llm';
import {
	MSG_PART_TYPE_CALL_PREFIX,
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
		this.parts[this.parts.length - 1].content =
			this.parts[this.parts.length - 1].content.trim();
		return this.parts;
	}

	private checkCallPart(part: MsgPart): MsgPart {
		if (!part.type.startsWith(MSG_PART_TYPE_CALL_PREFIX)) {
			return part;
		}

		// Parse call (*call:toolName(...))
		try {
			console.log(part.type);
			let callEnd = part.type.indexOf(
				'(',
				MSG_PART_TYPE_CALL_PREFIX.length
			);
			if (callEnd < 0) {
				callEnd = part.type.length;
			}
			const name = part.type.slice(
				MSG_PART_TYPE_CALL_PREFIX.length,
				callEnd
			);
			const args = JSON.parse(part.content);

			const content: FunctionCallContent = {
				type: 'function_call',
				id: Math.random().toString(36).slice(2),
				name,
				args: JSON.stringify(args),
			};

			return {
				type: MSG_PART_TYPE_FUNCTION_CALL,
				content: JSON.stringify(content),
			};
		} catch {
			return part;
		}
	}

	process() {
		let lastPart = this.parts.pop()!;
		while (this.cursor < this.buffer.length) {
			const lineEnd = this.buffer.indexOf('\n', this.cursor);
			if (lineEnd < 0) {
				// No more line
				break;
			}
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
			if (line.startsWith('```')) {
				const blockType = line.slice(3).trim();
				if (blockType.length > 0) {
					this.parts.push(lastPart);
					lastPart = {
						type: blockType,
						content: '',
					};
				} else if (lastPart.type !== MSG_PART_TYPE_TEXT) {
					this.parts.push(this.checkCallPart(lastPart));
					lastPart = {
						type: MSG_PART_TYPE_TEXT,
						content: '',
					};
				} else {
					this.parts.push(lastPart);
					lastPart = {
						type: 'plaintext',
						content: '',
					};
				}
				line = '';
			}

			// Append the line to the last part
			lastPart.content += line;
			this.cursor = lineEnd + 1;
		}
		this.parts.push({ ...lastPart });
	}
}
