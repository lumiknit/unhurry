import { BiRegularSend } from 'solid-icons/bi';
import { Component, onMount } from 'solid-js';
import { toast } from 'solid-toast';

import { getUserConfig } from '@store';

import InputTags from './PromptTags';

interface Props {
	progressing?: boolean;
	send?: (value: string) => void;
	cancel?: () => void;
}

const BottomInput: Component<Props> = (props) => {
	let topRef: HTMLDivElement;
	let taRef: HTMLTextAreaElement;

	let autoSendAt = 0;
	let autoSendTimeoutId: number | undefined;

	let composing = false;
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
		autosizeTextarea();
	};

	const replaceText = (text: string) => {
		taRef!.value = text;
		taRef!.setSelectionRange(text.length, text.length);
		taRef!.focus();
		autosizeTextarea();
	};

	const send = async () => {
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
		try {
			await props.send?.(v);
		} catch (e) {
			toast.error('Failed to send: ' + e);
			taRef!.value = v;
			lastSent = 0;
		}
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

		autoSendAt = Date.now() + as;
		if (autoSendTimeoutId === undefined) {
			autoSendTimeoutId = window.setTimeout(autoSend, as);
		}
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

	const handleButtonClick = (e: MouseEvent) => {
		e.stopPropagation();
		if (props.progressing) {
			toast('Canceling the current operation...');
			props.cancel?.();
		} else {
			send();
		}
	};

	const autosizeTextarea = () => {
		if (taRef!) {
			taRef.style.height = '1px';
			taRef.style.height = `${taRef.scrollHeight + 2}px`;
		}
	};

	const handleClickMargin = () => {
		taRef!.focus();
	};

	// When mounted, focus
	onMount(() => {
		taRef!.focus();
		autosizeTextarea();
	});

	return (
		<div
			ref={topRef!}
			class="bottom-fixed bottom-input"
			onClick={handleClickMargin}
		>
			<textarea
				ref={taRef!}
				onBeforeInput={handleBeforeInput}
				onCompositionEnd={handleCompositionEnd}
				onInput={handleInput}
				onChange={autosizeTextarea}
				onKeyUp={handleKeyUp}
				placeholder="Type your message here..."
			/>
			<div class="buttons no-user-select">
				<InputTags
					onInsertText={insertText}
					onReplaceText={replaceText}
				/>
				<div onClick={handleButtonClick} class="control">
					<button
						class={
							'button button-send p-3 ' +
							(props.progressing
								? ' is-loading is-warning'
								: 'is-primary')
						}
					>
						<BiRegularSend />
					</button>
				</div>
			</div>
		</div>
	);
};

export default BottomInput;
