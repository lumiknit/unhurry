/**
 * Generate long unique ID, which only contains alphanum and underscore.
 */
export const uniqueID = (): string => {
	const now = Date.now().toString(36);
	const rand = Math.random().toString(36).slice(2);
	return now + rand;
};

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
