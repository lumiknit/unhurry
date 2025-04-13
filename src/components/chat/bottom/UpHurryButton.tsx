import { BiRegularCommand } from 'solid-icons/bi';
import { Component, Show } from 'solid-js';

import { createIsMobile } from '@/components/utils/media';

interface Props {
	onToggle: () => void;
	enabled: boolean;
}

const UphurryButton: Component<Props> = (props) => {
	const isMobile = createIsMobile();
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
			<Show when={!isMobile()}>
				<span>UpHurry</span>
			</Show>
		</button>
	);
};

export default UphurryButton;
