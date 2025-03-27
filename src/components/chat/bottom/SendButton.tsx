import { BiRegularSend } from 'solid-icons/bi';
import { Component, createSignal, onCleanup, onMount } from 'solid-js';
import { toast } from 'solid-toast';

import { vibrate } from '@/store/actions';

import { getChatContext, store } from '@store';

import './send_button.scss';

type Props = {
	onSend: () => void;
	onCancel: () => void;
};

const SendButton: Component<Props> = (props) => {
	const handleButtonClick = (e: MouseEvent) => {
		e.stopPropagation();
		vibrate('medium');

		if (getChatContext().progressing) {
			toast('Canceling the current operation...');
			props.onCancel();
		} else {
			props.onSend();
		}
	};

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
		<div onClick={handleButtonClick} class="control">
			<button
				class={
					'button button-send p-3 ' +
					(getChatContext().progressing
						? 'is-loading is-warning'
						: 'is-primary')
				}
			>
				<BiRegularSend />
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
