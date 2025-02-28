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

	const send = () => {
		const v = taRef!.value.trim();
		if (v === '') {
			// Do nothing for empty string
			return;
		}
		taRef!.value = '';
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

	const handleInput = () => {
		autosizeTextarea();
		setAutoSend();
	};

	const handleKeyDown = (e: KeyboardEvent) => {
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
						{' '}
						Auto-send: {autoSendTimeout()} ms
					</span>
				</Show>
			</div>
			<div class="field is-grouped is-align-content-stretch">
				<p class="control is-expanded">
					<textarea
						ref={taRef!}
						class="textarea inline"
						onInput={handleInput}
						onChange={autosizeTextarea}
						onKeyDown={handleKeyDown}
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
