import { BiRegularCommand } from 'solid-icons/bi';
import { Component, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { createIsMobile } from '@/components/utils/media';
import { getUphurryMode, setUphurryMode } from '@/store';

const UphurryButton: Component = () => {
	const isMobile = createIsMobile();

	const handleClick = () => {
		const mode = getUphurryMode();
		if (mode) {
			toast('Uphurry OFF!');
		} else {
			toast('Uphurry ON!');
		}
		setUphurryMode((s) => !s);
	};

	return (
		<button
			class={`tag h-full is-uphurry ${getUphurryMode() ? 'is-primary ' : ''}`}
			aria-haspopup="true"
			aria-controls="dropdown-menu"
			onClick={handleClick}
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
