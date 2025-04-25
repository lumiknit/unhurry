import { BiSolidPalette } from 'solid-icons/bi';
import { Component, Show } from 'solid-js';

import { togglePalette } from '@/components/palette/state';
import { createIsMobile } from '@/components/utils/media';

const SlashButton: Component = () => {
	const isMobile = createIsMobile();
	return (
		<button class="tag h-full" onClick={() => togglePalette('/')}>
			<span class="icon">
				<BiSolidPalette />
			</span>
			<Show when={!isMobile()}>
				<span>Palette</span>
			</Show>
		</button>
	);
};

export default SlashButton;
