import { BiRegularMicrophone, BiRegularSend } from 'solid-icons/bi';
import {
	Accessor,
	Component,
	createEffect,
	onCleanup,
	onMount,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { toast } from 'solid-toast';

import { autoSendLaunchAt, getUserConfig } from '@/store/config';
import { vibrate } from '@/store/global_actions';
import { getCurChatProcessing } from '@/store/store';

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
	let circleRef: SVGCircleElement;

	let animation: Animation | undefined;

	const animateProgress = (ms: number) => {
		if (!circleRef!) return;
		if (animation) animation.cancel();
		animation = circleRef.animate(
			[
				{
					strokeDashoffset: 0.9 * 2 * Math.PI,
				},
				{
					strokeDashoffset: 0,
				},
			],
			ms
		);
	};

	const resetProgress = () => {
		if (animation) animation.cancel();
		animation = undefined;
		circleRef!.style.strokeDashoffset = `${0.9 * 2 * Math.PI}`;
	};

	const className = () => {
		let additional = '';
		if (getCurChatProcessing()) {
			additional = 'is-loading is-warning';
		} else if (props.speechRecognizing()) {
			additional = 'is-danger';
		} else {
			additional = 'is-primary';
		}
		return 'button is-rounded p-2 is-size-5 ' + additional;
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

		if (!getCurChatProcessing() && !props.speechRecognizing()) {
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

		// Blur the current focused element
		if (getUserConfig().blurOnSendButton) {
			try {
				(document.activeElement as HTMLElement)?.blur?.();
			} catch {
				console.warn('Failed to blur the active element');
			}
		}

		if (props.speechRecognizing()) {
			if (stopSRWhenUp) {
				props.stopSpeechRecognition();
			}
		} else if (getCurChatProcessing()) {
			toast('Canceling the current operation...');
			props.onCancel();
		} else {
			props.onSend();
		}

		clearTimeouts();
	};

	onCleanup(clearTimeouts);

	onMount(() => {
		resetProgress();
	});

	createEffect(() => {
		const a = autoSendLaunchAt();
		if (a) {
			const millisLeft = a - Date.now();
			animateProgress(millisLeft);
		} else {
			resetProgress();
		}
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
					ref={circleRef!}
					class="circle-progress"
					r="0.9"
					cx="1"
					cy="1"
					stroke="currentColor"
					stroke-width="0.2"
					stroke-linecap="round"
					stroke-dasharray={`${0.9 * 2 * Math.PI}`}
					fill="transparent"
				/>
			</svg>
		</div>
	);
};

export default SendButton;
