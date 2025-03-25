import { BiRegularPlus } from 'solid-icons/bi';
import { Component, For, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { Color } from '@/lib/config';

export interface Item {
	icon?: Component;
	label: string;
	color: Color;
}

type ItemProps = Item & {
	selected: boolean;
	onClick: () => void;
};

const Item: Component<ItemProps> = (props) => {
	return (
		<button
			class={
				'button is-small mr-1 mb-1 is-' +
				props.color +
				(props.selected ? '' : ' is-dark')
			}
			onClick={props.onClick}
		>
			<Show when={props.icon}>
				<Dynamic component={props.icon} />
			</Show>
			{props.label}
		</button>
	);
};

interface Props {
	items: Item[];
	selected: number;

	onSelect: (idx: number) => void;
	onAdd: () => void;
}

const ItemList: Component<Props> = (props) => {
	return (
		<div class="flex flex-wrap">
			<For each={props.items}>
				{(item, idx) => (
					<Item
						{...item}
						selected={idx() === props.selected}
						onClick={() => props.onSelect(idx())}
					/>
				)}
			</For>
			<Item
				icon={BiRegularPlus}
				label="Add"
				color="none"
				selected={true}
				onClick={props.onAdd}
			/>
		</div>
	);
};

export default ItemList;
