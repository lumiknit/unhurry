import { VsChevronDown, VsChevronUp } from 'solid-icons/vs';
import { Component, createSignal, Match, Show, Switch } from 'solid-js';

import { FunctionCallContent } from '@/lib/llm';

import { ItemProps } from './message_types';

const FnCallMessage: Component<ItemProps> = (props) => {
	const [fold, setFold] = createSignal(true);

	const fnCall: FunctionCallContent = JSON.parse(props.content);

	return (
		<Switch>
			<Match when={fold()}>
				<div
					class="msg-code msg-code-fold flex-split"
					onClick={() => setFold(false)}
				>
					<span class="text-ellipsis">
						@ <b>{fnCall.name}</b> {fnCall.args}
					</span>
					<button>
						<VsChevronDown />
					</button>
				</div>
			</Match>
			<Match when>
				<div class="msg-code">
					<header class="flex-split" onClick={() => setFold(true)}>
						<span>
							@ <b>{fnCall.name}</b>
						</span>
						<span>
							<button>
								<VsChevronUp />
							</button>
						</span>
					</header>
					<div class="msg-code-body">
						{fnCall.args}
						<Show when={fnCall.result}>
							<hr class="my-2 has-background-text thin-hr" />
							{fnCall.result}
						</Show>
					</div>
				</div>
			</Match>
		</Switch>
	);
};

export default FnCallMessage;
