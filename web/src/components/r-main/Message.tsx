import { Component, Match, Switch } from 'solid-js';

import type { ThreadMessage } from '../../lib/thread/types';

interface MessageProps {
	message: ThreadMessage;
}

const Message: Component<MessageProps> = (props) => {
	return (
		<div class="message-item">
			<Switch>
				<Match when={props.message.type === 'user_text'}>
					<div class="message-user">
						<div class="message-role">You</div>
						<div class="message-content">
							{(props.message as any).text}
						</div>
					</div>
				</Match>

				<Match when={props.message.type === 'ai_text'}>
					<div class="message-assistant">
						<div class="message-role">Unhurry</div>
						<div class="message-content">
							{(props.message as any).text}
						</div>
					</div>
				</Match>

				<Match when={props.message.type === 'system_noti'}>
					<div class="message-system">
						<div class="message-content">
							{(props.message as any).text}
						</div>
					</div>
				</Match>

				<Match when={true}>
					<div class="message-other">
						<div class="message-role">{props.message.type}</div>
						<div class="message-content">
							{JSON.stringify(props.message)}
						</div>
					</div>
				</Match>
			</Switch>
		</div>
	);
};

export default Message;
