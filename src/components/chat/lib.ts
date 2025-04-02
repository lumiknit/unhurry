export const scrollToLastUserMessage = () => {
	const elems = document.getElementsByClassName('msg-user');
	if (elems.length > 0) {
		const last = elems[elems.length - 1];
		const rect = last.getBoundingClientRect();
		const top = window.scrollY + rect.top - 54;
		// current scroll position
		window.scrollTo({
			top,
			behavior: 'smooth',
		});
	}
};

/**
 * Global Shortcut
 */
export const globalShortcut = (event: KeyboardEvent) => {};
