import { Component, For, Show } from 'solid-js';

import Message from './Message';
import Title from './Title';
import { Msg } from '../../lib/chat';
import { getChatContext, getStreamingMessage } from '../../store';

const ChatHistoryView: Component = () => {
	type MsgItem = {
		user?: Msg;
		assistant?: Msg;
		streaming?: string;
	};
	const messages = (): MsgItem[] => {
		const outs: MsgItem[] = [];
		for (const m of getChatContext().history.messages) {
			if (m.role === 'user') {
				outs.push({ user: m });
			} else {
				const last = outs[outs.length - 1];
				if (last && !last.assistant) {
					last.assistant = m;
				} else {
					outs.push({ assistant: m });
				}
			}
		}
		if (getStreamingMessage()) {
			outs[outs.length - 1].streaming = getStreamingMessage();
		}
		return outs;
	};
	return (
		<div>
			<Title />
			<For each={messages()}>
				{(item, idx) => (
					<div class="msg-group">
						<Show when={item.user}>
							<Message msg={item.user!} idx={idx()} />
						</Show>
						<Show when={item.assistant}>
							<Message msg={item.assistant!} idx={idx()} />
						</Show>
						<Show when={item.streaming}>
							<div class="streaming-msg">
								{item.streaming}
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
