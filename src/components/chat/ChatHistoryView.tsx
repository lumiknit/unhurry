import { Component, createEffect, For } from 'solid-js';

import Message from './Message';
import Title from './Title';
import { getChatContext } from '../../store';

const ChatHistoryView: Component = () => {
	let last_history_length = 0;

	createEffect(() => {
		// When messages change, scroll to bottom
		const l = getChatContext().history.messages.length;
		if (l <= last_history_length) return;
		last_history_length = l;
		setTimeout(() => {
			window.scrollTo({
				top: document.body.scrollHeight,
				behavior: 'smooth',
			});
		}, 50);
	});

	return (
		<div>
			<Title />
			<For each={getChatContext().history.messages}>
				{(msg, idx) => <Message msg={msg} idx={idx()} />}
			</For>
		</div>
	);
};

export default ChatHistoryView;
