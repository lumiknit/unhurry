import { BiRegularMicrophone, BiRegularMicrophoneOff } from 'solid-icons/bi';
import {
	Component,
	createSignal,
	JSX,
	Match,
	onCleanup,
	splitProps,
	Switch,
} from 'solid-js';

type Props = JSX.IntrinsicElements['button'] & {
	onSpeech?: (
		transcript: string,
		isFinal: boolean,
		lastTranscript: string
	) => void;
	onError?: (error: Error) => void;
	onClick?: (e: MouseEvent) => void;
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
	const [props, btnProps] = splitProps(props_, ['onSpeech', 'onClick']);

	let sr: any;

	const setupSpeechRecognition = () => {
		if (SpeechRecognition === undefined) {
			throw new Error(
				'SpeechRecognition is not supported in this browser'
			);
		}
		sr = new SpeechRecognition();
		sr.continuous = true;
		sr.interimResults = true;
		sr.maxAlternatives = 3;
	};

	const startSpeechRecognition = () => {
		if (!sr) setupSpeechRecognition();

		let lastResult = '';

		sr.onresult = (event: SpeechRecognitionEvent) => {
			const resultIndex = event.resultIndex;
			const result = event.results[
				resultIndex
			] as SpeechRecognitionResult;
			const transcript = result[0].transcript;
			const isFinal = result.isFinal as boolean;
			props.onSpeech?.(transcript, isFinal, lastResult);
			lastResult = isFinal ? '' : transcript;
		};

		sr.start();
	};

	const stopSpeechRecognition = () => {
		sr?.stop();
		sr = undefined;
	};

	const handleClick = (e: MouseEvent) => {
		props.onClick?.(e);

		// toggle recording
		if (!recording()) {
			startSpeechRecognition();
			setRecording(true);
		} else {
			stopSpeechRecognition();
			setRecording(false);
		}
	};

	onCleanup(() => {
		stopSpeechRecognition();
	});

	return (
		<button {...btnProps} onClick={handleClick}>
			<Switch>
				<Match when={recording()}>
					<BiRegularMicrophoneOff />
				</Match>
				<Match when>
					<BiRegularMicrophone />
				</Match>
			</Switch>
		</button>
	);
};

export default SpeechButton;
