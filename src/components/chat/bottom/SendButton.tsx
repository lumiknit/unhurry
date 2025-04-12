import { BiRegularMicrophone, BiRegularSend } from 'solid-icons/bi';
import {
	Accessor,
	Component,
	createSignal,
	onCleanup,
	onMount,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { toast } from 'solid-toast';

import { vibrate } from '@/store/global_actions';

import { getFocusedChatState, store } from '@store';

import './send_button.scss';

const LONG_PRESS_DURATION = 800;
const HOLD_DURATION = 1200;

type Props = {
	speechRecognizing: Accessor<boolean>;
	startSpeechRecognition: () => void;
	stopSpeechRecognition: () => void;

	onSend: () => void;
	onCancel: () => void;
};

const SendButton: Component<Props> = (props) => {
	const className = () => {
		let additional = '';
		if (getFocusedChatState().progressing) {
			additional = 'is-loading is-warning';
		} else if (props.speechRecognizing()) {
			additional = 'is-danger';
		} else {
			additional = 'is-primary';
		}
		return 'button button-send p-3 ' + additional;
	};

	const icon = () =>
		props.speechRecognizing() ? BiRegularMicrophone : BiRegularSend;

	let stopSRWhenUp = false;
	let srStartTimeout: number | null = null;
	let srHoldTimeout: number | null = null;

	const startRecog = () => {
		console.log('Start recognition');
		vibrate('light');
		srStartTimeout = null;
		stopSRWhenUp = false;
		props.startSpeechRecognition();
	};

	const setHolding = () => {
		console.log('Holding');
		vibrate('light');
		srHoldTimeout = null;
		stopSRWhenUp = true;
	};

	const clearTimeouts = () => {
		stopSRWhenUp = true;
		if (srStartTimeout) {
			clearTimeout(srStartTimeout);
			srStartTimeout = null;
		}
		if (srHoldTimeout) {
			clearTimeout(srHoldTimeout);
			srHoldTimeout = null;
		}
	};

	const handlePointerDown = (e: PointerEvent) => {
		e.stopPropagation();
		e.preventDefault();

		stopSRWhenUp = true;
		clearTimeout(srStartTimeout!);
		clearTimeout(srHoldTimeout!);
		vibrate('medium');

		if (!getFocusedChatState().progressing && !props.speechRecognizing()) {
			srStartTimeout = window.setTimeout(startRecog, LONG_PRESS_DURATION);
			srHoldTimeout = window.setTimeout(setHolding, HOLD_DURATION);
		}
	};

	const handlePointerLeave = (e: PointerEvent) => {
		console.log('Leave', e);
		e.stopPropagation();
		e.preventDefault();
		clearTimeouts();
	};

	const handlePointerUp = (e: PointerEvent) => {
		console.log('Up', e);
		e.stopPropagation();
		e.preventDefault();

		if (props.speechRecognizing()) {
			if (stopSRWhenUp) {
				props.stopSpeechRecognition();
			}
		} else if (getFocusedChatState().progressing) {
			toast('Canceling the current operation...');
			props.onCancel();
		} else {
			props.onSend();
		}

		clearTimeouts();
	};

	onCleanup(clearTimeouts);

	let running = false;

	const [dash, setDash] = createSignal<[number, number]>([0, 0]);

	const updateSVG = () => {
		const autoSendSetAt = store.autoSendSetAt;
		const autoSendLaunchAt = store.autoSendLaunchAt;
		if (autoSendSetAt && autoSendLaunchAt) {
			const now = Date.now();
			const diff = now - autoSendSetAt;
			const total = autoSendLaunchAt - autoSendSetAt;
			const autoSendRatio = 1.0 - diff / total;
			setDash([autoSendRatio * 2 * Math.PI, 2 * Math.PI]);
		} else {
			setDash([2 * Math.PI, 2 * Math.PI]);
		}
		if (running) requestAnimationFrame(updateSVG);
	};

	onMount(() => {
		running = true;
		updateSVG();
	});

	onCleanup(() => {
		running = false;
	});

	return (
		<div
			onPointerDown={handlePointerDown}
			onPointerUp={handlePointerUp}
			onPointerLeave={handlePointerLeave}
			class="control"
		>
			<button class={className()} type="button" aria-label="Send">
				<Dynamic component={icon()} />
			</button>
			<svg
				class="auto-send-progress has-text-warning"
				viewBox="0 0 2 2"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle
					r="0.9"
					cx="1"
					cy="1"
					stroke="currentColor"
					stroke-width="0.2"
					stroke-linecap="round"
					stroke-dashoffset={String(dash()[0])}
					stroke-dasharray={String(dash()[1])}
					fill="transparent"
				/>
			</svg>
		</div>
	);
};

export default SendButton;
