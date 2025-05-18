import { parseJSOCall } from '../jso';
import {
	ChatHistory,
	Msg,
	MSG_PART_TYPE_ARTIFACT,
	MSG_PART_TYPE_FUNCTION_CALL,
	MSG_PART_TYPE_TEXT,
	MSG_PART_TYPE_THINK,
	MsgPart,
} from './structs';
import { getMarkdownLanguageFromFileName } from '../artifact/mime';
import {
	getArtifactBlob,
	getArtifactDataURL,
	getArtifactMeta,
} from '../idb/artifact_storage';
import {
	FunctionCallContent,
	LLMMessage,
	LLMMessages,
	Role,
	TypedContent,
} from '../llm/message';
import { ModelOpts, ToolCallStyle } from '../llm/model_config';
import { stringToMDCodeBlock } from '../md';

/**
 * Message format converter.
 * This will handle conversion between lib/chat Msg and LLM Messages.
 */
export class MsgConverter {
	private cursor = 0;
	buffer = '';
	parts: MsgPart[] = [
		{
			type: MSG_PART_TYPE_TEXT,
			content: '',
		},
	];

	thinkOpenText: string = '';
	thinkCloseText: string = '';
	useThink: boolean = false;

	toolCallStyle: ToolCallStyle = 'builtin';

	/**
	 * Number of backticks for closing block.
	 * This is for parser
	 */
	quotes: number = 3;

	constructor(modelOpts?: ModelOpts) {
		this.thinkOpenText = modelOpts?.thinkOpen || '';
		this.thinkCloseText = modelOpts?.thinkClose || '';
		this.useThink = !!this.thinkOpenText && !!this.thinkCloseText;

		this.toolCallStyle = modelOpts?.toolCallStyle || 'builtin';
	}

	// Parser: LLM Message -> Msg

	/**
	 * Full step parse.
	 */
	static parse(data: string, modelInfo?: ModelOpts): MsgPart[] {
		const parser = new MsgConverter(modelInfo);
		parser.inputToParse(data);
		parser.parseStep();
		return parser.finishParsing();
	}

	parseState(): [MsgPart[], string] {
		return [this.parts, this.buffer.slice(this.cursor)];
	}

	/**
	 * Push the data into buffer.
	 */
	inputToParse(data: string) {
		this.buffer += data;
		this.parseStep();
	}

	/**
	 * Finish the buffer and return the parts.
	 */
	finishParsing(): MsgPart[] {
		this.inputToParse('\n');
		const parts = this.parts.filter((p) => {
			return p.type !== MSG_PART_TYPE_TEXT || p.content.trim().length > 0;
		});
		return parts;
	}

	private checkCallPart(part: MsgPart): MsgPart {
		console.log(part, this.toolCallStyle);
		if (this.toolCallStyle === 'builtin') return part;

		// toolCallStyle === 'gemma'
		if (part.type !== 'tool_code') return part;

		const [fn, , idx] = parseJSOCall(part.content);

		const content: FunctionCallContent = {
			type: 'function_call',
			id: Math.random().toString(36).slice(2),
			name: fn,
			args: part.content.slice(idx),
		};

		return {
			type: MSG_PART_TYPE_FUNCTION_CALL,
			content: JSON.stringify(content),
		};
	}

	/**
	 * Process.
	 * If there are new lines, push as the new line.
	 */
	private parseStep() {
		// Early return if no new lines
		let lineEnd = this.buffer.indexOf('\n', this.cursor);
		if (lineEnd < 0) {
			return;
		}

		let lastPart = this.parts.pop()!;
		do {
			let line = this.buffer.slice(this.cursor, lineEnd + 1);

			// Handle reasoning block
			if (this.useThink) {
				if (
					lastPart.type === MSG_PART_TYPE_TEXT &&
					line.startsWith(this.thinkOpenText)
				) {
					this.parts.push(lastPart);
					lastPart = {
						type: MSG_PART_TYPE_THINK,
						content: '',
					};
					line = line.slice(this.thinkOpenText.length);
				}
				if (
					lastPart.type === MSG_PART_TYPE_THINK &&
					line.startsWith(this.thinkCloseText)
				) {
					this.parts.push(lastPart);
					lastPart = {
						type: MSG_PART_TYPE_TEXT,
						content: '',
					};
					line = line.slice(this.thinkCloseText.length);
				}
			}

			// Handle code block
			const bt = line.match(/^(\s*)(```+)/);
			if (bt !== null) {
				const indent = bt[1];
				const backticks = bt[2].length;
				let blockType = line.slice(bt[0].length).trim();

				if (lastPart.type === MSG_PART_TYPE_TEXT) {
					let blockExtra: string | undefined;
					// Open the block
					if (!blockType) {
						blockType = 'plaintext';
					} else {
						const idx = blockType.indexOf(' ');
						if (idx > 0) {
							blockExtra = blockType.slice(idx + 1);
							blockType = blockType.slice(0, idx);
						}
					}
					this.quotes = backticks;
					lastPart.content = lastPart.content.trimEnd();
					this.parts.push(lastPart);
					lastPart = {
						type: blockType,
						typeExtra: blockExtra,
						content: '',
						indent,
					};
					line = '';
				} else if (backticks >= this.quotes && !blockType) {
					// close the block
					lastPart.content = lastPart.content.trimEnd();
					this.parts.push(this.checkCallPart(lastPart));
					lastPart = {
						type: MSG_PART_TYPE_TEXT,
						content: '',
					};
					line = '';
				}
			}

			// Append the line to the last part
			if (lastPart.indent && line.startsWith(lastPart.indent)) {
				line = line.slice(lastPart.indent.length);
			}
			lastPart.content += line;
			this.cursor = lineEnd + 1;

			lineEnd = this.buffer.indexOf('\n', this.cursor);
		} while (this.cursor < this.buffer.length && lineEnd >= 0);

		this.parts = [...this.parts, { ...lastPart }];
	}

	// Formatter: Msg -> LLM Messages

	// Format
	async formatMsg(dst: LLMMessages, msg: Msg) {
		const push = (role: Role, ...contents: TypedContent[]) => {
			let last = dst[dst.length - 1];
			if (!last || last.role !== role) {
				last = new LLMMessage(role, []);
				dst.push(last);
			}
			const ltc: TypedContent[] =
				typeof last.content === 'string'
					? [
							{
								type: 'text',
								text: last.content,
							},
						]
					: last.content;
			last.content = ltc;
			for (const c of contents) {
				const lltc = ltc[ltc.length - 1];
				if (c.type === 'text' && lltc && lltc.type === 'text') {
					// Merge text
					lltc.text += '\n\n' + c.text;
				} else {
					ltc.push(c);
				}
			}
		};
		const postUserContents: TypedContent[] = [];
		for (const part of msg.parts) {
			switch (part.type) {
				case MSG_PART_TYPE_THINK:
					// Ignore for tokens
					break;
				case MSG_PART_TYPE_ARTIFACT:
					{
						const artifact = await getArtifactMeta(part.content);
						if (artifact) {
							if (artifact.mimeType.startsWith('image/')) {
								const dataURL = await getArtifactDataURL(
									part.content
								);
								if (dataURL) {
									push(msg.role, {
										type: 'image_url',
										image_url: { url: dataURL },
									});
								}
							} else {
								let textContent = '';
								const v = await getArtifactBlob(part.content);
								if (v) {
									const bytes = new Uint8Array(
										await v.arrayBuffer()
									);
									if (bytes.length === 0) {
										textContent = '<EMPTY FILE>';
									} else {
										const decoder = new TextDecoder(
											'utf-8'
										);
										textContent = decoder.decode(bytes);
									}
								} else {
									textContent = '<FILE NOT FOUND>';
								}
								const mdLang = getMarkdownLanguageFromFileName(
									artifact.name
								);
								push(msg.role, {
									type: 'text',
									text: stringToMDCodeBlock(
										`${mdLang} id=${JSON.stringify(artifact._id)} uri=${JSON.stringify(artifact.uri)}`,
										textContent
									),
								});
							}
						}
					}
					break;
				case MSG_PART_TYPE_FUNCTION_CALL:
					{
						const t: FunctionCallContent = JSON.parse(part.content);
						switch (this.toolCallStyle) {
							case 'gemma':
								{
									// For the current user, push as markdown block 'tool_code'
									push(msg.role, {
										type: 'text',
										text: stringToMDCodeBlock(
											'tool_code',
											`${t.name} ${t.args}`
										),
									});
									// For 'USER' message, push the result as 'tool_output'
									if (t.result) {
										postUserContents.push({
											type: 'text',
											text: stringToMDCodeBlock(
												'tool_output',
												t.result
											),
										});
									}
								}
								break;
							default:
								push(msg.role, t);
						}
					}
					break;
				default: {
					if (part.type === MSG_PART_TYPE_TEXT) {
						push(msg.role, {
							type: 'text',
							text: part.content,
						});
					} else {
						let t = part.type;
						if (part.typeExtra) {
							t += ' ' + part.typeExtra;
						}
						push(msg.role, {
							type: 'text',
							text: stringToMDCodeBlock(
								t,
								part.content,
								part.indent
							),
						});
					}
				}
			}
		}
		for (const c of postUserContents) {
			push('user', c);
		}
	}

	/**
	 * Pack message parts into the LLM Messages
	 * @param parts
	 */
	async format(history: ChatHistory): Promise<LLMMessages> {
		const outputs: LLMMessages = [];
		for (const pair of history.msgPairs) {
			if (pair.user) {
				await this.formatMsg(outputs, pair.user);
			}
			if (pair.assistant) {
				await this.formatMsg(outputs, pair.assistant);
			}
		}
		console.log(outputs);
		return outputs;
	}
}
