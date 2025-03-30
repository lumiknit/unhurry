import { BiRegularMicrophone, BiRegularMicrophoneOff } from 'solid-icons/bi';
import { Component, JSX, Match, splitProps, Switch } from 'solid-js';

type Props = JSX.IntrinsicElements['button'] & {
	startRecognition?: () => Promise<void>;
	stopRecognition?: () => Promise<void>;
	recognizing?: () => boolean;
};

const SpeechButton: Component<Props> = (props_) => {
	const [props, btnProps] = splitProps(props_, [
		'startRecognition',
		'stopRecognition',
		'recognizing',
	]);

	const handleClick = async () => {
		// toggle recording
		if (!props.recognizing?.()) {
			await props.startRecognition?.();
		} else {
			await props.stopRecognition?.();
		}
	};

	return (
		<button {...btnProps} onClick={handleClick}>
			<Switch>
				<Match when={props.recognizing?.()}>
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
