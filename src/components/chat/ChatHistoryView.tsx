import {
	Component,
	createMemo,
	For,
	Match,
	onMount,
	Show,
	Switch,
} from 'solid-js';

import { assistantMsg, MsgPair } from '@/lib/chat';
import { scrollToLastUserMessage } from '@/lib/utils';
import {
	getChatContext,
	getChatWarnings,
	getCurChatProcessing,
	getFocusedChatUphurryProgress,
	getShowRawMessage,
	getStreamingParts,
	getStreamingRest,
} from '@/store/store';

import { Message } from './message';
import Title from './Title';
import { openChatWarningsModal } from '../modal/ChatWarningsModal';

type Props = {
	isLast?: boolean;
	pair: MsgPair;
};

const StreamingInfo: Component = () => {
	return (
		<>
			<Show when={getStreamingParts()}>
				<Message msg={assistantMsg(getStreamingParts())} />
			</Show>
			<Show when={getStreamingRest()}>
				<div
					class={
						'streaming-msg ' +
						(getShowRawMessage() ? 'msg-raw' : '')
					}
				>
					{getStreamingRest()}
				</div>
			</Show>
			<Switch>
				<Match when={getFocusedChatUphurryProgress()}>
					<div class="message-body msg-user theme-dark is-uphurry has-text-centered">
						<span class="spinner" />
					</div>
				</Match>
				<Match when={getCurChatProcessing()}>
					<div class="has-text-centered">
						<span class="spinner spinner-primary" />
					</div>
				</Match>
			</Switch>
			<Show when={getChatWarnings().length > 0}>
				<div
					class="notification is-warning px-3 py-2"
					onClick={() => {
						if (getChatWarnings().length > 1)
							openChatWarningsModal(getChatWarnings());
					}}
				>
					<b>{getChatWarnings().at(-1)}</b>
					<Show when={getChatWarnings().length > 1}>
						<span class="is-underlined">
							({getChatWarnings().length} more warnings...)
						</span>
					</Show>
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
