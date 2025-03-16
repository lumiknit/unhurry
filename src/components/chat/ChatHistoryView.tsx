import { Component, createMemo, For, Show } from 'solid-js';

import Message from './Message';
import Title from './Title';
import { getChatContext, getStreamingMessage } from '../../store';

const ChatHistoryView: Component = () => {
	const pairs = createMemo(() => getChatContext().history.msgPairs);

	return (
		<div>
			<Title />
			<For each={pairs()}>
				{(item, idx) => (
					<div class="msg-group">
						<Show when={item.user}>
							<Message msg={item.user!} idx={idx()} />
						</Show>
						<Show when={item.assistant}>
							<Message msg={item.assistant!} idx={idx()} />
						</Show>
						<Show
							when={
								pairs().length - 1 === idx() &&
								getStreamingMessage()
							}
						>
							<div class="streaming-msg">
								{getStreamingMessage()}
								<span class="spinner" />
							</div>
						</Show>
					</div>
				)}
			</For>
		</div>
	);
};

export default ChatHistoryView;
