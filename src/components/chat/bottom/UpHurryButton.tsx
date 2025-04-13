import { BiRegularCommand } from 'solid-icons/bi';
import { Component } from 'solid-js';

interface Props {
	onToggle: () => void;
	enabled: boolean;
}

const UphurryButton: Component<Props> = (props) => {
	return (
		<button
			class={`tag h-full is-uphurry ${props.enabled ? 'is-primary ' : ''}`}
			aria-haspopup="true"
			aria-controls="dropdown-menu"
			onClick={props.onToggle}
		>
			<span class="icon">
				<BiRegularCommand />
			</span>
			<span class="hide-mobile">UpHurry</span>
		</button>
	);
};

export default UphurryButton;
