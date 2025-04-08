import { TbChevronRight } from 'solid-icons/tb';
import { Accessor, Component, createSignal, Show } from 'solid-js';

import { Step, elapsedMillis } from '@/lib/task';

import StatusIcon from './StatusIcon';

type Props = {
	idx: number;
	step: Accessor<Step>;
};

const StepItem: Component<Props> = (props) => {
	const [isOpen, setIsOpen] = createSignal(false);
	return (
		<div class="mb-2">
			<button
				class="button is-fullwidth is-flex"
				onClick={() => setIsOpen(!isOpen())}
			>
				<span
					class={
						'icon transition-transform ' + (isOpen() ? 'cw-90' : '')
					}
				>
					<TbChevronRight />
				</span>
				<StatusIcon status={props.step().status} />
				<div class="text-ellipsis flex-1">
					{props.idx + 1}. {props.step().goal.split('\n')[0]}
				</div>

				<span>{(elapsedMillis(props.step()) / 1000).toFixed()}s</span>
			</button>
			<Show when={isOpen()}>
				<div class="p-2">{props.step().goal}</div>
			</Show>
		</div>
	);
};

export default StepItem;
