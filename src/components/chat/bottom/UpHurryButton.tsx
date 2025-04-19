import { BiRegularCommand } from 'solid-icons/bi';
import { Component, Show } from 'solid-js';

import { createIsMobile } from '@/components/utils/media';
import { getUphurryMode, setUphurryMode } from '@/store';

const UphurryButton: Component = () => {
	const isMobile = createIsMobile();
	return (
		<button
			class={`tag h-full is-uphurry ${getUphurryMode() ? 'is-primary ' : ''}`}
			aria-haspopup="true"
			aria-controls="dropdown-menu"
			onClick={() => setUphurryMode((s) => !s)}
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
