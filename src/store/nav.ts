import { createSignal } from 'solid-js';

/**
 * Navigate Helper. This signal is used in the root component, to navigate to the next URL.
 */
export const [getNextURL, goto] = createSignal<string | undefined>(undefined, {
	equals: false,
});
