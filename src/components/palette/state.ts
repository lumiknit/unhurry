import { createSignal } from 'solid-js';

export const [showPalette, setShowPalette] = createSignal<false | string>(
	false
);

export const togglePalette = (initialValue?: string) =>
	setShowPalette((s) => {
		return s === false ? initialValue || '' : false;
	});
