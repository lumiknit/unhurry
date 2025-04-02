import { Component, createMemo, For, onMount, Show } from 'solid-js';

import { getChatContext, getStreamingMessage } from '@store';

import { scrollToLastUserMessage } from './lib';
import { Message } from './message';
import Title from './Title';

const ChatHistoryView: Component = () => {
	const pairs = createMemo(() => getChatContext().history.msgPairs);

	onMount(() => {
		setTimeout(() => scrollToLastUserMessage(), 100);
	});

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
						<Show when={pairs().length - 1 === idx()}>
							<Show when={getStreamingMessage()}>
								<Message
									msg={{
										role: 'assistant',
										parts: getStreamingMessage()!.parts,
										timestamp: Date.now(),
									}}
									idx={idx()}
								/>
								<div class="streaming-msg">
									{getStreamingMessage()!.rest}
								</div>
							</Show>
							<Show when={getChatContext().progressing}>
								<div class="text-center">
									<span class="spinner" />
								</div>
							</Show>
						</Show>
					</div>
				)}
			</For>
		</div>
	);
};

export default ChatHistoryView;
