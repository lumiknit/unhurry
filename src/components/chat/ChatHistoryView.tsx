import { Component, createMemo, For, onMount, Show } from 'solid-js';

import { MsgPair } from '@/lib/chat';
import { scrollToLastUserMessage } from '@/lib/utils';

import {
	getChatContext,
	getChatWarnings,
	getFocusedChatProgressing,
	getFocusedChatUphurryProgress,
	getStreamingParts,
	getStreamingRest,
} from '@store';

import { Message } from './message';
import Title from './Title';

type Props = {
	isLast?: boolean;
	pair: MsgPair;
};

const StreamingInfo: Component = () => {
	return (
		<>
			<Show when={getStreamingParts()}>
				<Message
					msg={{
						role: 'assistant',
						parts: getStreamingParts(),
						timestamp: Date.now(),
					}}
				/>
			</Show>
			<Show when={getStreamingRest()}>
				<div class="streaming-msg">{getStreamingRest()}</div>
			</Show>
			<Show
				when={
					!getFocusedChatProgressing() &&
					getFocusedChatUphurryProgress()
				}
			>
				<div class="message-body msg-user is-uphurry has-text-centered">
					<span class="spinner" />
				</div>
			</Show>
			<Show when={getFocusedChatProgressing()}>
				<div class="has-text-centered">
					<span class="spinner spinner-primary" />
				</div>
			</Show>
			<Show when={getChatWarnings().length > 0}>
				<div class="notification is-warning px-3 py-2">
					<ul>
						<For each={getChatWarnings()}>
							{(w) => <li>{w}</li>}
						</For>
					</ul>
				</div>
			</Show>
		</>
	);
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
				<StreamingInfo />
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
		<>
			<Title />
			<For each={pairs()}>
				{(item, idx) => (
					<MessagePair
						pair={item}
						isLast={idx() === pairs().length - 1}
					/>
				)}
			</For>
			<Show when={pairs().length === 0}>
				<MessagePair pair={{}} isLast={true} />
			</Show>
		</>
	);
};

export default ChatHistoryView;
