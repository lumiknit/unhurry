import { Component, Show } from 'solid-js';

import Palette from './Palette';
import { setShowPalette, showPalette } from './state';

const PaletteContainer: Component = () => {
	return (
		<Show when={showPalette() !== false}>
			<div class="plt-container" onClick={() => setShowPalette(false)}>
				<Palette init={showPalette() || ''} />
			</div>
		</Show>
	);
};

export default PaletteContainer;
