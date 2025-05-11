import { Component, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { getBEService, ISpeechRecognizer } from '@/lib/be';
import { logr } from '@/lib/logr';
import { getUserConfig, setAutoSendLaunchAt } from '@/store/config';
import { cancelCurrentChat, chat } from '@/store/global_actions';
import { getCurChatProcessing, getUphurryMode } from '@/store/store';

import InputTags from './PromptTags';
import SendButton from './SendButton';
import SlashButton from './SlashButton';
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
	let hiddenTARef: HTMLTextAreaElement;

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
		autosizeTextarea();
		updateInputTriple();
	};

	const replaceText = (text: string) => {
		taRef!.value = text;
		taRef!.setSelectionRange(text.length, text.length);
		autosizeTextarea();
	};

	const send = async () => {
		unsetAutoSend();
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
		if (!getUphurryMode() && !composing) {
			taRef!.value = '';
			lastSent = 0;
			autosizeTextarea();
		}
		setFiles([]);
		try {
			logr.info('[BottomInput] Input: ', v);

			// Pick the last user message and scroll to top.
			await chat(
				v,
				fs.map((f) => f.id),
				getUphurryMode()
			);
		} catch (e) {
			toast.error('Failed to send: ' + e);
			taRef!.value = v;
			setFiles(fs);
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
		setAutoSendLaunchAt(null);
	};

	/**
	 * Set auto send timeout
	 */
	const setAutoSend = () => {
		const as = autoSendTimeout();
		if (!getUserConfig()?.enableAutoSend || !as || getCurChatProcessing())
			return;

		const now = Date.now();
		setAutoSendLaunchAt(now + as);
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
		setAutoSendLaunchAt(null);
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

	const handleKeyDown = (e: KeyboardEvent) => {
		updateInputTriple();
		console.log(e);
		if (e.isComposing) return;
		switch (e.key) {
			case 'Enter':
				{
					const modifier = e.shiftKey || e.ctrlKey || e.metaKey;
					if (modifier !== !!getUserConfig()?.enterKeyToSend) {
						e.preventDefault();
						send();
					}
				}
				break;
			case 'Escape':
				{
					unsetAutoSend();
					taRef!.blur();
				}
				break;
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
				logr.info('onTranscript', transcript, isFinal, lastTranscript);
				// Remove if the last transcript is exists
				logr.info(taRef!.selectionStart);
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
		hiddenTARef!.style.width = `${taRef!.offsetWidth}px`;
		hiddenTARef!.value = taRef!.value;
		taRef!.style.height = `${hiddenTARef!.scrollHeight}px`;
	};

	const handleClickMargin = (e: MouseEvent) => {
		// If event target is 'div' tag
		if (e.target instanceof HTMLElement) {
			if (e.target.classList.contains('bottom-input')) {
				taRef!.focus();
			}
		}
	};

	// When mounted, focus
	onMount(() => {
		autosizeTextarea();
	});

	const placeholder = () => {
		if (getUserConfig()?.enterKeyToSend) {
			return 'Enter key to send, Shift+Enter to newline';
		} else {
			return 'Shift+Enter to send, Enter to newline';
		}
	};

	return (
		<div
			ref={topRef!}
			class={'bottom-input ' + (getUphurryMode() ? 'is-uphurry' : '')}
			onClick={handleClickMargin}
		>
			<textarea
				ref={taRef!}
				onBeforeInput={handleBeforeInput}
				onCompositionEnd={handleCompositionEnd}
				onInput={handleInput}
				onChange={autosizeTextarea}
				onKeyDown={handleKeyDown}
				placeholder={placeholder()}
			/>
			<textarea ref={hiddenTARef!} class="autosize-hidden-ta" />
			<Show when={files().length > 0}>
				<UploadedFiles
					files={files()}
					onDelete={(id) =>
						setFiles((fs) => fs.filter((v) => v.id !== id))
					}
				/>
			</Show>
			<Show when={getUphurryMode()}>
				<p class="is-size-7">UpHurry mode. Write a goal.</p>
			</Show>
			<div class="buttons gap-1 no-user-select">
				<SpeechButton
					class="control is-size-6 px-1"
					startRecognition={startSpeechRecognition}
					stopRecognition={stopSpeechRecognition}
					recognizing={() => speechRecognizing()}
				/>
				<UploadFileButton
					onFile={(name, id) =>
						setFiles((fs) => [...fs, { name, id }])
					}
				/>
				<SlashButton />
				<InputTags
					textState={inputTriple}
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
					onRemovePrev={(text) => {
						const it = inputTriple();
						let start = it[0];
						if (it[0].endsWith(text)) {
							start = it[0].slice(0, -text.length);
						}
						const newText = start + it[1] + it[2];
						replaceText(newText);
						taRef!.setSelectionRange(start.length, start.length);
					}}
					onFile={(name, id) => {
						setFiles((fs) => [...fs, { name, id }]);
					}}
				/>
				<SendButton
					speechRecognizing={speechRecognizing}
					startSpeechRecognition={startSpeechRecognition}
					stopSpeechRecognition={stopSpeechRecognition}
					onSend={send}
					onCancel={() => {
						cancelCurrentChat();
					}}
				/>
			</div>
		</div>
	);
};

export default BottomInput;
