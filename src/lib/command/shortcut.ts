export const symAlt = '⌥';
export const symShift = '⇧';
export const symMeta = '⌘';

export const keyEventToShortcut = (event: KeyboardEvent): string => {
	let key = event.key;
	if (event.metaKey || event.ctrlKey) key = symMeta + key;
	if (event.shiftKey) key = symShift + key;
	if (event.altKey) key = symAlt + key;
	return key;
};
