import { TbSend } from 'solid-icons/tb';
import { Component, For, onMount, Show } from 'solid-js';

import { getUserConfig, setUserConfig } from '../../store';

type Props = {
	onInput?: (value: string) => void;
};

const BottomInput: Component<Props> = (props) => {
	let taRef: HTMLTextAreaElement;

	let autoSendAt = 0;
	let autoSendTimeoutId: number | undefined;

	let composing: boolean = false;
	let lastSent = 0;

	const insertText = (text: string) => {
		const ta = taRef!;
		const selStart = ta.selectionStart;
		const selEnd = ta.selectionEnd;
		const v = ta.value;
		const newV = v.slice(0, selStart) + text + v.slice(selEnd);
		ta.value = newV;
		ta.setSelectionRange(selStart + text.length, selStart + text.length);
		ta.focus();
	};

	const send = () => {
		let v: string = taRef!.value;
		if (lastSent > 0) {
			v = v.slice(lastSent);
		}
		lastSent = taRef!.value.length;
		v = v.trim();
		if (v === '') {
			// Do nothing for empty string
			return;
		}
		// Dispatch right arrow event
		if (!composing) {
			taRef!.value = '';
			lastSent = 0;
		} else {
			// Otherwise, some composing left.
			// Just ignore the send
		}
		console.log(v, lastSent);
		props.onInput?.(v);
		autosizeTextarea();
	};

	const autoSendTimeout = (): number | undefined => {
		const v = getUserConfig()?.autoSendMillis;
		if (v && v > 0) {
			return Math.floor(v);
		}
	};

	const autoSend = () => {
		if (autoSendAt >= Date.now()) {
			// Reassign
			autoSendTimeoutId = window.setTimeout(
				autoSend,
				autoSendAt - Date.now()
			);
		} else {
			autoSendTimeoutId = undefined;
			send();
		}
	};

	const setAutoSend = () => {
		const as = autoSendTimeout();
		if (!getUserConfig()?.enableAutoSend || !as) return;
		if (autoSendTimeoutId) clearTimeout(autoSendTimeoutId);

		autoSendAt = Date.now() + as;
		autoSendTimeoutId = window.setTimeout(autoSend, as);
	};

	const cleanSent = () => {
		if (lastSent > 0) {
			// Last selection
			const selStart = taRef!.selectionStart - lastSent;
			const selEnd = taRef!.selectionEnd - lastSent;
			// Remove last sent
			taRef!.value = taRef!.value.slice(lastSent);
			// Update selection
			taRef!.setSelectionRange(selStart, selEnd);
			lastSent = 0;
		}
	};

	const handleCompositionEnd = () => {
		cleanSent();
		composing = false;
	};

	const handleBeforeInput = (e: InputEvent) => {
		if (!e.isComposing) {
			cleanSent();
		}
	};

	const handleInput = (e: InputEvent) => {
		composing = e.isComposing;
		//console.log('composing', e, e.isComposing);
		autosizeTextarea();
		setAutoSend();
	};

	const handleKeyUp = (e: KeyboardEvent) => {
		if (e.isComposing) return;
		if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			setTimeout(send, 10);
		}
		setAutoSend();
	};

	const handleButtonClick = () => {
		send();
	};

	const autosizeTextarea = () => {
		if (taRef!) {
			taRef.style.height = '1px';
			taRef.style.height = `${taRef.scrollHeight + 2}px`;
		}
	};

	const toggleAutoSend = () => {
		setUserConfig((c) => ({
			...c,
			enableAutoSend: !c.enableAutoSend,
		}));
	};

	// When mounted, focus
	onMount(() => {
		taRef!.focus();
	});

	const insertChips: {
		label: string;
		value: string;
	}[] = [
		{
			label: 'Korean',
			value: 'Translate to Korean: ',
		},
		{
			label: 'Japanese',
			value: 'Translate to Japanese: ',
		},
		{
			label: 'English',
			value: 'Translate to English: ',
		},
		{
			label: 'Run JS',
			value: '```run-js\n',
		},
	];

	return (
		<div>
			<div>
				<Show when={autoSendTimeout()}>
					<button
						class={
							'tag' +
							(getUserConfig()?.enableAutoSend
								? ' is-warning'
								: '')
						}
						onClick={toggleAutoSend}
					>
						Auto-send: {autoSendTimeout()} ms
					</button>
				</Show>
				<For each={insertChips}>
					{(chip) => (
						<button
							class="tag"
							onClick={() => insertText(chip.value)}
						>
							{chip.label}
						</button>
					)}
				</For>
			</div>
			<div class="field is-grouped is-align-content-stretch">
				<p class="control is-expanded">
					<textarea
						ref={taRef!}
						class="textarea inline"
						onBeforeInput={handleBeforeInput}
						onCompositionEnd={handleCompositionEnd}
						onInput={handleInput}
						onChange={autosizeTextarea}
						onKeyUp={handleKeyUp}
						placeholder="Type your message here..."
					/>
				</p>
				<button
					class="control button is-primary"
					onClick={handleButtonClick}
				>
					<TbSend />
				</button>
			</div>
		</div>
	);
};

export default BottomInput;
