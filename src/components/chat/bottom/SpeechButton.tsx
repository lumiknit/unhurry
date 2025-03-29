import { BiRegularMicrophone, BiRegularMicrophoneOff } from 'solid-icons/bi';
import {
	Component,
	createEffect,
	createSignal,
	JSX,
	Match,
	onCleanup,
	splitProps,
	Switch,
} from 'solid-js';
import {toast} from 'solid-toast';

import { getBEService } from '@/lib/be';

type Props = JSX.IntrinsicElements['button'] & {
	onSpeech?: (
		transcript: string,
		isFinal: boolean,
		lastTranscript: string
	) => void;
	onSRError?: (error: Error, message: string) => void;
	onClick?: (e: MouseEvent) => void;

	/** Send detection */
	cnt: number;
};

type WindowWithSpeechRecognition = Window & {
	SpeechRecognition: FunctionConstructor | undefined;
	SpeechGrammarList: FunctionConstructor | undefined;
	SpeechRecognitionEvent: FunctionConstructor | undefined;
	webkitSpeechRecognition: FunctionConstructor | undefined;
	webkitSpeechGrammarList: FunctionConstructor | undefined;
	webkitSpeechRecognitionEvent: FunctionConstructor | undefined;
};
const w = () => window as unknown as WindowWithSpeechRecognition;

const SpeechRecognition = w().SpeechRecognition || w().webkitSpeechRecognition;
/* const SpeechGrammarList = w().SpeechGrammarList || w().webkitSpeechGrammarList;
const SpeechRecognitionEvent =
	w().SpeechRecognitionEvent || w().webkitSpeechRecognitionEvent;*/

type SpeechRecognitionResult = SpeechRecognitionAlternative[] & {
	isFinal: boolean;
};

type SpeechRecognitionEvent = Event & {
	type: 'result';
	resultIndex: number;
	results: SpeechRecognitionResult[];
};

const SpeechButton: Component<Props> = (props_) => {
	const [recording, setRecording] = createSignal(false);
	const [props, btnProps] = splitProps(props_, [
		'onSpeech',
		'onClick',
		'onSRError',
		'cnt',
	]);

	let sr: any;

	/*
	const setupSpeechRecognition = () => {
		if (SpeechRecognition === undefined) {
			throw new Error(
				'SpeechRecognition is not supported in this browser'
			);
		}
		sr = new SpeechRecognition();
		sr.continuous = true;
		sr.interimResults = true;
		sr.maxAlternatives = 1;
	};

	const startSpeechRecognition = () => {
		logr.info('[chat/SpeechButton] Start speech recognition');
		if (!sr) setupSpeechRecognition();

		let lastResult = '';

		sr.onresult = (event: SpeechRecognitionEvent) => {
			const resultIndex = event.resultIndex;
			const result = event.results[
				resultIndex
			] as SpeechRecognitionResult;
			const confidence = result[0].confidence;
			const transcript = result[0].transcript;
			const isFinal = result.isFinal as boolean;

			logr.info(
				'[chat/SpeechButton] Speech recognition result',
				JSON.stringify({
					resultIndex: event.resultIndex,
					isFinal,
					transcript,
					confidence,
				})
			);

			props.onSpeech?.(transcript, isFinal, lastResult);
			lastResult = isFinal ? '' : transcript;
		};
		sr.onerror = (event: ErrorEvent) => {
			logr.error(
				'[chat/SpeechButton] Speech recognition error',
				JSON.stringify({
					error: event.error,
					message: event.message,
					timestamp: event.timeStamp,
				})
			);
			props.onSRError?.(event.error, event.message);
			stopSpeechRecognition();
		};

		sr.start();
	};

	const stopSpeechRecognition = () => {
		logr.info('[chat/SpeechButton] Stop speech recognition');
		sr?.stop();
		sr = undefined;
	};
	*/

	let speechTimeout: number = 0;

	const startSpeechRecognition = async () => {
		const be = await getBEService();
		try {
			await be.startSpeechRecognition([]);
		} catch (e) {
			toast.error("Failed to start speech recognition: " + e);
			throw e;
		}
		let lastResult = '';
		speechTimeout = window.setInterval(async () => {
			const be = await getBEService();
			const res = await be.getSpeechRecognitionState();
			console.log(res);
			const t = res.completedText + " " + res.partialText;
			props.onSpeech?.(t, false, lastResult);
			lastResult = t;
		}, 300);
	};

	const stopSpeechRecognition = async () => {
		const be = await getBEService();
		await be.stopSpeechRecognition();
		clearTimeout(speechTimeout);
	}


	const restartSpeechRecognition = () => {
		if (sr) {
			stopSpeechRecognition();
			startSpeechRecognition();
		}
	};

	const handleClick = async (e: MouseEvent) => {
		props.onClick?.(e);

		// toggle recording
		if (!recording()) {
			await startSpeechRecognition();
			setRecording(true);
		} else {
			await stopSpeechRecognition();
			setRecording(false);
		}
	};

	onCleanup(() => {
		stopSpeechRecognition();
	});

	createEffect(() => {
		// Subscribe cnt.

		const c = props.cnt;
		if (c > 0) {
			restartSpeechRecognition();
		}
	});

	return (
		<button {...btnProps} onClick={handleClick}>
			<Switch>
				<Match when={recording()}>
					<BiRegularMicrophoneOff class="mic-recording" />
				</Match>
				<Match when>
					<BiRegularMicrophone />
				</Match>
			</Switch>
		</button>
	);
};

export default SpeechButton;
