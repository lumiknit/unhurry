import { Component, createMemo, For, Show } from 'solid-js';

import { getChatContext, getStreamingMessage } from '@store';

import { Message } from './message';
import Title from './Title';

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
								<div class="text-center">
									<span class="spinner" />
								</div>
							</div>
						</Show>
					</div>
				)}
			</For>
		</div>
	);
};

export default ChatHistoryView;
