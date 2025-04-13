import { Component, createMemo, For, onMount, Show } from 'solid-js';

import { MsgPair } from '@/lib/chat';

import {
	getChatContext,
	getFocusedChatProgressing,
	getStreamingMessage,
} from '@store';

import { scrollToLastUserMessage } from './lib';
import { Message } from './message';
import Title from './Title';

type Props = {
	isLast?: boolean;
	pair: MsgPair;
};

const MessagePair: Component<Props> = (props) => {
	return (
		<div class="msg-group">
			<Show when={props.pair.user}>
				<Message msg={props.pair.user!} />
			</Show>
			<Show when={props.pair.assistant}>
				<Message msg={props.pair.assistant!} />
			</Show>
			<Show when={props.isLast}>
				<Show when={getStreamingMessage()}>
					<Message
						msg={{
							role: 'assistant',
							parts: getStreamingMessage()!.parts,
							timestamp: Date.now(),
						}}
					/>
					<div class="streaming-msg">
						{getStreamingMessage()!.rest}
					</div>
				</Show>
				<Show when={getFocusedChatProgressing()}>
					<div class="text-center">
						<span class="spinner" />
					</div>
				</Show>
			</Show>
		</div>
	);
};

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
					<MessagePair
						pair={item}
						isLast={idx() === pairs().length - 1}
					/>
				)}
			</For>
		</div>
	);
};

export default ChatHistoryView;
