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
import { toast } from 'solid-toast';

import { getBEService, ISpeechRecognizer } from '@/lib/be';

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

const SpeechButton: Component<Props> = (props_) => {
	const [recording, setRecording] = createSignal(false);
	const [props, btnProps] = splitProps(props_, [
		'onSpeech',
		'onClick',
		'onSRError',
		'cnt',
	]);

	let sr: ISpeechRecognizer | null = null;

	const startSpeechRecognition = async () => {
		const be = await getBEService();
		if (!be) {
			toast.error('Speech recognition not supported');
			return;
		}
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
			console.log('onTranscript', transcript, isFinal, lastTranscript);
			props.onSpeech?.(transcript, isFinal, lastTranscript);
		};
		sr.onError = (error: string) => {
			toast.error('Speech recognition error: ' + error);
			props.onSRError?.(new Error(error), error);
		};
		sr.onStopped = () => {
			toast.error('Speech recognition stopped');
			setRecording(false);
		};
		sr.start();
	};

	const stopSpeechRecognition = async () => {
		if (sr) {
			await sr.stop();
		}
		sr = null;
	};

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
					<span class="mic-recording" />
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
