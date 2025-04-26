import { Component, For, JSX, onMount, splitProps } from 'solid-js';

export type ButtonProps = JSX.IntrinsicElements['button'] & {
	authfocus?: boolean;
	label: string;
	onClick?: () => void;
	onEscape?: () => void;
};

const Btn: Component<ButtonProps> = (props_) => {
	let btnRef: HTMLButtonElement;
	const [props, btnProps] = splitProps(props_, [
		'label',
		'onClick',
		'onEscape',
		'autofocus',
	]);

	const handleKeyDown = (e: KeyboardEvent) => {
		console.log(e);
		let handled = true;
		switch (e.key) {
			case 'Escape':
				props.onEscape?.();
				break;
			case 'Enter':
			case 'Space':
				props.onClick?.();
				break;
			case 'ArrowLeft':
				{
					const sibling = btnRef!
						.previousElementSibling as HTMLElement;
					if (sibling) {
						sibling.focus();
					}
				}
				break;
			case 'ArrowRight':
				{
					const sibling = btnRef!.nextElementSibling as HTMLElement;
					if (sibling) {
						sibling.focus();
					}
				}
				break;
			default:
				handled = false;
		}
		if (!handled) {
			e.preventDefault();
			e.stopPropagation();
		}
	};

	onMount(() => {
		if (props.autofocus) {
			console.log('FOCUS');
			btnRef!.focus();
		}
	});

	return (
		<button
			ref={btnRef!}
			tabIndex={0}
			{...btnProps}
			onClick={props.onClick}
			onKeyDown={handleKeyDown}
		>
			{props.label}
		</button>
	);
};

type Props = {
	autofocus?: boolean;
	buttons: ButtonProps[];
	onEscape?: () => void;
};

const Buttons: Component<Props> = (props) => {
	return (
		<For each={props.buttons}>
			{(button, idx) => (
				<Btn
					{...button}
					autofocus={idx() === 0 && props.autofocus}
					onEscape={props.onEscape}
				/>
			)}
		</For>
	);
};

export default Buttons;
