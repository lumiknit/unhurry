import { TbSend } from 'solid-icons/tb';
import { Component, onMount, Show } from 'solid-js';

import { getUserConfig } from '../../store';

type Props = {
	onInput?: (value: string) => void;
};

const BottomInput: Component<Props> = (props) => {
	let taRef: HTMLTextAreaElement;

	let autoSendAt = 0;
	let autoSendTimeoutId: number | undefined;

	let composing: boolean = false;
	let lastSent = 0;

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
		if (!as) return;
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

	// When mounted, focus
	onMount(() => {
		taRef!.focus();
	});

	return (
		<div>
			<div>
				<Show when={autoSendTimeout()}>
					<span class="tag is-warning">
						Auto-send: {autoSendTimeout()} ms
					</span>
				</Show>
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
