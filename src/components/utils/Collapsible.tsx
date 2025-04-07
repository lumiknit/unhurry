import { Component, createSignal, JSX, Show, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';

type Props = JSX.IntrinsicElements['div'] & {
	header: Component;
	children: JSX.Element;
};

const Collapsible: Component<Props> = (props_) => {
	const [props, divProps] = splitProps(props_, ['header', 'children']);

	const [isOpen, setIsOpen] = createSignal(false);

	return (
		<div {...divProps}>
			<button
				onClick={() => setIsOpen(!isOpen())}
				class="collapsible-header"
			>
				<Dynamic component={props.header} />
			</button>

			<Show when={isOpen()}>{props.children}</Show>
		</div>
	);
};

export default Collapsible;
