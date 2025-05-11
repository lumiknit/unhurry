import { createEffect, createSignal, For } from 'solid-js';

import { guessIndentStyle } from '@/lib/string';

type Props = {
	initValue: string;
	onValue?: (v: string) => void;
};

const CodeEdit = (props: Props) => {
	let textareaRef: HTMLTextAreaElement | undefined;
	const [indentStyle, setIndentStyle] = createSignal(
		guessIndentStyle(props.initValue)
	);
	const [wrap, setWrap] = createSignal(true);

	const handleChange = () => {
		props.onValue?.(textareaRef!.value);
	};

	const insert = (v: string) => {
		const ov = textareaRef!.value;
		const start = textareaRef!.selectionStart;
		const end = textareaRef!.selectionEnd;
		textareaRef!.value = ov.slice(0, start) + v + ov.slice(end);
		textareaRef!.selectionStart = textareaRef!.selectionEnd =
			start + v.length;
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (!textareaRef) return;
		switch (e.key) {
			case 'Tab':
				{
					e.preventDefault();
					const start = textareaRef.selectionStart;
					const end = textareaRef.selectionEnd;
					const tab = indentStyle().s;
					if (!e.shiftKey && start === end) {
						// Just insert tab
						insert(tab);
					} else {
						const blockStart =
							textareaRef.value.lastIndexOf('\n', start - 1) + 1;
						// Split by line
						let lines: string[] = textareaRef.value
							.slice(blockStart, end)
							.split('\n');
						let startDiff = 0;
						let endDiff = 0;
						if (e.shiftKey) {
							startDiff -= tab.length;
							lines = lines.map((l) => {
								if (l.startsWith(tab)) {
									endDiff -= tab.length;
									return l.slice(tab.length);
								} else if (l.startsWith('\t')) {
									endDiff -= 1;
									return l.slice(1);
								}
								return l;
							});
						} else {
							lines = lines.map((l) => tab + l);
							startDiff = tab.length;
							endDiff = tab.length * lines.length;
						}
						console.log(startDiff, endDiff);
						const ns = textareaRef.selectionStart + startDiff;
						const ne = textareaRef.selectionEnd + endDiff;
						textareaRef.value =
							textareaRef.value.slice(0, blockStart) +
							lines.join('\n') +
							textareaRef.value.slice(end);
						console.log('New', ns, ne);
						textareaRef.selectionStart = ns;
						textareaRef.selectionEnd = ne;
					}
				}
				break;
			case 'Enter':
				{
					e.preventDefault();
					const value = textareaRef.value;
					const start = textareaRef.selectionStart;

					// Find the current line start
					const lineStart = value.lastIndexOf('\n', start - 1) + 1;
					const indentMatch = /[ \t]*/.exec(
						value.slice(lineStart, start)
					);
					const indent = indentMatch ? indentMatch[0] : '';
					insert('\n' + indent);
				}
				break;
		}
	};

	const indentModes: Record<string, string> = {
		spaces: ' ',
		tabs: '\t',
	};

	createEffect(() => {
		console.log(indentStyle());
	});

	return (
		<>
			<div>
				<div class="select is-small">
					<select
						onChange={(e) => {
							const v = e.currentTarget.value;
							const ts = indentStyle().tabSize;
							let s = indentModes[v];
							if (s === ' ') {
								s = ' '.repeat(ts);
							}
							setIndentStyle({
								s,
								tabSize: ts,
							});
						}}
					>
						<optgroup label="Indent Mode">
							<For each={['spaces', 'tabs']}>
								{(v) => (
									<option
										value={v}
										selected={indentStyle().s.startsWith(
											indentModes[v]
										)}
									>
										{v}
									</option>
								)}
							</For>
						</optgroup>
					</select>
				</div>
				<div class="select is-small">
					<select
						onChange={(e) => {
							const v = parseInt(e.currentTarget.value);
							setIndentStyle({
								s: indentStyle().s,
								tabSize: v,
							});
						}}
					>
						<optgroup label="Tab Size">
							<For each={[2, 3, 4, 6, 8]}>
								{(v) => (
									<option
										value={v}
										selected={v === indentStyle().tabSize}
									>
										{v}
									</option>
								)}
							</For>
						</optgroup>
					</select>
				</div>
				<div class="select is-small">
					<select
						onChange={(e) => {
							const v = e.currentTarget.value;
							setWrap(v === 'wrap');
						}}
					>
						<optgroup label="Wrap Mode">
							<For each={['wrap', 'nowrap']}>
								{(v) => (
									<option
										value={v}
										selected={wrap() === (v === 'wrap')}
									>
										{v}
									</option>
								)}
							</For>
						</optgroup>
					</select>
				</div>
			</div>
			<textarea
				ref={textareaRef}
				class="textarea is-family-monospace"
				value={props.initValue}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				rows={20}
				style={{
					'white-space': wrap() ? 'pre-wrap' : 'pre',
					'overflow-wrap': wrap() ? 'break-word' : 'normal',
					'text-indent': indentStyle().s,
					'tab-size': indentStyle().tabSize,
				}}
			/>
		</>
	);
};

export default CodeEdit;
