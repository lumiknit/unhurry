import { Component, createSignal, onMount, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { logr } from '@/lib/logr';
import { cancelAllChats, chat, generateChatTitle } from '@/store/actions';

import {
	getChatContext,
	getUserConfig,
	saveChatContextMeta,
	setChatContext,
	setStore,
} from '@store';

import InputTags from './PromptTags';
import SendButton from './SendButton';
import SpeechButton from './SpeechButton';
import UploadedFiles from './UploadedFiles';
import UploadFileButton from './UploadFileButton';

interface FileInput {
	name: string;
	id: string;
}

const BottomInput: Component = () => {
	let topRef: HTMLDivElement;
	let taRef: HTMLTextAreaElement;

	let autoSendAt = 0;
	let autoSendTimeoutId: number | undefined;

	let composing = false;
	let lastSent = 0;

	const [files, setFiles] = createSignal<FileInput[]>([]);
	const [sendCnt, setSendCnt] = createSignal(0);

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

		const fs = files();

		// Dispatch right arrow event
		if (!composing) {
			taRef!.value = '';
			lastSent = 0;
		} else {
			// Otherwise, some composing left.
			// Just ignore the send
		}
		setFiles([]);

		setSendCnt((c) => c + 1);
		const isFirst = getChatContext().history.msgPairs.length === 0;
		try {
			logr.info('LLM Input: ', v);
			setChatContext((c) => ({ ...c, progressing: true }));

			// Pick the last user message and scroll to top.
			setTimeout(() => {
				const elems = document.getElementsByClassName('msg-user');
				if (elems.length > 0) {
					const last = elems[elems.length - 1];
					const rect = last.getBoundingClientRect();
					const top = window.scrollY + rect.top - 54;
					// current scroll position
					window.scrollTo({
						top,
						behavior: 'smooth',
					});
				}
			}, 33);
			await chat(
				v,
				fs.map((f) => f.id)
			);
		} catch (e) {
			toast.error('Failed to send: ' + e);
			taRef!.value = v;
			setFiles(fs);
			lastSent = 0;
		}
		setChatContext((c) => ({ ...c, progressing: false }));
		if (isFirst) {
			// Generate a title
			const title = await generateChatTitle();
			logr.info('Generated title: ', title);
			setChatContext((c) => ({ ...c, title }));
			saveChatContextMeta();
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
			clearAutoSend();
			send();
		}
	};

	/**
	 * Clear all auto send related states
	 */
	const clearAutoSend = () => {
		autoSendTimeoutId = undefined;
		setStore('autoSendSetAt', undefined);
		setStore('autoSendLaunchAt', undefined);
	};

	/**
	 * Set auto send timeout
	 */
	const setAutoSend = () => {
		const as = autoSendTimeout();
		if (!getUserConfig()?.enableAutoSend || !as) return;

		const now = Date.now();
		setStore('autoSendSetAt', now);
		setStore('autoSendLaunchAt', now + as);
		autoSendAt = now + as;
		if (autoSendTimeoutId === undefined) {
			autoSendTimeoutId = window.setTimeout(autoSend, as);
		}
	};

	/**
	 * Unset auto send timeout
	 */
	const unsetAutoSend = () => {
		if (autoSendTimeoutId) {
			clearTimeout(autoSendTimeoutId);
		}
		clearAutoSend();
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
		switch (e.key) {
			case 'Enter':
				{
					if (e.shiftKey || e.ctrlKey || e.metaKey) {
						e.preventDefault();
						send();
					}
				}
				break;
			case 'Escape':
			case 'Backspace':
				{
					unsetAutoSend();
				}
				break;
			default: {
				setAutoSend();
			}
		}
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

	const handleClickMargin = (e: MouseEvent) => {
		let tagName = '';
		// If event target is 'div' tag
		if (e.target instanceof HTMLElement) {
			tagName = e.target.tagName;
		}
		if (tagName === 'DIV') {
			taRef!.focus();
		}
	};

	// When mounted, focus
	onMount(() => {
		taRef!.focus();
		autosizeTextarea();
	});

	return (
		<div ref={topRef!} class="bottom-input" onClick={handleClickMargin}>
			<textarea
				ref={taRef!}
				onBeforeInput={handleBeforeInput}
				onCompositionEnd={handleCompositionEnd}
				onInput={handleInput}
				onChange={autosizeTextarea}
				onKeyUp={handleKeyUp}
				placeholder="Type your message here..."
			/>
			<Show when={files().length > 0}>
				<UploadedFiles
					files={files()}
					onDelete={(id) =>
						setFiles((fs) => fs.filter((v) => v.id !== id))
					}
				/>
			</Show>
			<div class="buttons gap-1 no-user-select">
				<SpeechButton
					class="control is-size-6 py-1 button-mic"
					onSpeech={handleSpeech}
					onSRError={(e, msg) => {
						toast.error(`Failed to STT: ${e}, ${msg}`);
					}}
					cnt={sendCnt()}
				/>
				<UploadFileButton
					onFile={(name, id) =>
						setFiles((fs) => [...fs, { name, id }])
					}
				/>
				<InputTags
					onInsertText={insertText}
					onReplaceText={replaceText}
				/>
				<SendButton
					onSend={send}
					onCancel={() => {
						cancelAllChats();
					}}
				/>
			</div>
		</div>
	);
};

export default BottomInput;
