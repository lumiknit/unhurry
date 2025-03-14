import { TbSend } from 'solid-icons/tb';
import { Component, onMount } from 'solid-js';

import InputTags from './PromptTags';
import SpeechButton from './SpeechButton';
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

		autoSendAt = Date.now() + as;
		if (autoSendTimeoutId === undefined) {
			autoSendTimeoutId = window.setTimeout(autoSend, as);
		}
	};

	const unsetAutoSend = () => {
		if (autoSendTimeoutId) {
			clearTimeout(autoSendTimeoutId);
			autoSendTimeoutId = undefined;
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

	const handleButtonClick = () => {
		send();
	};

	const handleSpeech = (
		transcript: string,
		isFinal: boolean,
		lastTranscript: string
	) => {
		// Remove if the last transcript is exists
		if (lastTranscript) {
			const v = taRef!.value;
			const selStart = taRef!.selectionStart;
			const part = v.slice(0, selStart);
			if (v.endsWith(lastTranscript)) {
				taRef!.value =
					part.slice(0, -lastTranscript.length) + v.slice(selStart);
				taRef!.setSelectionRange(selStart, selStart);
			}
		}
		// Insert the transcript
		insertText(transcript);
		if (isFinal) {
			setAutoSend();
		} else {
			unsetAutoSend();
		}
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
			<InputTags onInsertText={insertText} onReplaceText={replaceText} />
			<div class="field is-grouped is-align-content-stretch">
				<SpeechButton
					class="control button is-danger"
					onSpeech={handleSpeech}
				/>
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
