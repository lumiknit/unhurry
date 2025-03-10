import { Component, createEffect, For, onCleanup, Show } from 'solid-js';

import Message from './Message';
import Title from './Title';
import { getChatContext, getStreamingMessage } from '../../store';

const ChatHistoryView: Component = () => {
	let lastStreamingMessage: string | undefined;
	let last_history_length = 0;

	const scrollToBottom = () => {
		window.scrollTo({
			top: document.body.scrollHeight,
			behavior: 'smooth',
		});
	};

	let delayedScroll: number | undefined;
	const addDelayedScroll = () => {
		if (delayedScroll) return;
		delayedScroll = window.setTimeout(() => {
			scrollToBottom();
			delayedScroll = undefined;
		}, 30);
	};

	createEffect(() => {
		// When messages change, scroll to bottom
		const lm = getStreamingMessage();
		const l = getChatContext().history.messages.length;
		if (l <= last_history_length && lastStreamingMessage === lm) return;
		lastStreamingMessage = lm;
		last_history_length = l;

		addDelayedScroll();
		scrollToBottom();
	});

	onCleanup(() => {
		if (delayedScroll) {
			clearTimeout(delayedScroll);
		}
	});

	return (
		<div>
			<Title />
			<For each={getChatContext().history.messages}>
				{(msg, idx) => <Message msg={msg} idx={idx()} />}
			</For>
			<Show when={getStreamingMessage()}>
				<pre class="streaming-msg">{getStreamingMessage()}</pre>
			</Show>
		</div>
	);
};

export default ChatHistoryView;
