import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { getBEService, ISpeechRecognizer } from '@/lib/be';
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
import { scrollToLastUserMessage } from '../lib';

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

	const [inputTriple, setInputTriple] = createSignal<
		[string, string, string]
	>(['', '', '']);

	const updateInputTriple = () => {
		const t = taRef!.value;
		const selStart = taRef!.selectionStart;
		const selEnd = taRef!.selectionEnd;
		setInputTriple([
			t.slice(0, selStart),
			t.slice(selStart, selEnd),
			t.slice(selEnd),
		]);
	};

	const insertText = (text: string, idx?: number) => {
		const ta = taRef!;
		let selStart = ta.selectionStart;
		const selEnd = ta.selectionEnd;
		let v = ta.value;

		if (idx === undefined) {
			idx = selStart;
			v = v.slice(0, selStart) + v.slice(selEnd);
		} else if (idx < 0) {
			idx = selEnd;
		}

		if (selStart <= idx) {
			selStart += text.length;
		}

		const newV = v.slice(0, idx) + text + v.slice(idx);
		ta.value = newV;
		ta.setSelectionRange(selStart, selStart);
		ta.focus();
		autosizeTextarea();
		updateInputTriple();
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
		const isFirst = getChatContext().history.msgPairs.length === 0;
		try {
			logr.info('LLM Input: ', v);
			setChatContext((c) => ({ ...c, progressing: true }));

			// Pick the last user message and scroll to top.
			setTimeout(scrollToLastUserMessage, 33);
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
		if (autoSendAt > Date.now()) {
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
		if (
			!getUserConfig()?.enableAutoSend ||
			!as ||
			getChatContext().progressing
		)
			return;

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
		updateInputTriple();

		composing = e.isComposing;
		autosizeTextarea();
		setAutoSend();
	};

	const handleKeyUp = (e: KeyboardEvent) => {
		updateInputTriple();
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

	// Speech Recognition
	let sr: ISpeechRecognizer | null = null;
	const [speechRecognizing, setSpeechRecognizing] = createSignal(false);

	const startSpeechRecognition = async () => {
		const be = await getBEService();
		if (!be) {
			toast.error('Speech recognition not supported');
			return;
		}
		if (!sr) {
			sr = await be.speechRecognizer();
			if (!sr) {
				toast.error('Speech recognition not supported');
				return;
			}
			sr.onTranscript = (
				transcript: string,
				isFinal: boolean,
				lastTranscript: string
			) => {
				console.log(
					'onTranscript',
					transcript,
					isFinal,
					lastTranscript
				);
				// Remove if the last transcript is exists
				if (lastTranscript) {
					const v = taRef!.value;
					const selStart = taRef!.selectionStart;
					const part = v.slice(0, selStart);
					if (part.endsWith(lastTranscript)) {
						taRef!.value =
							part.slice(0, -lastTranscript.length) +
							v.slice(selStart);
						const p = selStart - lastTranscript.length;
						taRef!.setSelectionRange(p, p);
					}
				}
				insertText(transcript);
				// Insert the transcript
				if (isFinal) {
					setAutoSend();
				} else {
					unsetAutoSend();
				}
			};
			sr.onError = (error: string) => {
				toast.error('Speech recognition error: ' + error);
			};
			sr.onStopped = () => {
				toast('Speech recognition stopped');
				setSpeechRecognizing(false);
			};
		}
		sr.start();
		setSpeechRecognizing(true);
	};

	const stopSpeechRecognition = async () => {
		if (sr) {
			await sr.stop();
		}
		sr = null;
		setSpeechRecognizing(false);
	};

	onCleanup(stopSpeechRecognition);

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
					startRecognition={startSpeechRecognition}
					stopRecognition={stopSpeechRecognition}
					recognizing={() => speechRecognizing()}
				/>
				<UploadFileButton
					onFile={(name, id) =>
						setFiles((fs) => [...fs, { name, id }])
					}
				/>
				<InputTags
					textState={inputTriple()}
					onInsertText={(text, toSend) => {
						insertText(text);
						if (toSend) {
							send();
						}
					}}
					onInsertStartText={(text, toSend) => {
						insertText(text, 0);
						if (toSend) {
							send();
						}
					}}
					onInsertEndText={(text, toSend) => {
						insertText(text, -1);
						if (toSend) {
							send();
						}
					}}
					onReplaceText={replaceText}
				/>
				<SendButton
					speechRecognizing={speechRecognizing}
					startSpeechRecognition={startSpeechRecognition}
					stopSpeechRecognition={stopSpeechRecognition}
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
