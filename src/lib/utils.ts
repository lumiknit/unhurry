/**
 * Generate long unique ID, which only contains alphanum and underscore.
 */
export const uniqueID = (): string => {
	const now = Date.now().toString(36);
	const rand = Math.random().toString(36).slice(2);
	return now + rand;
};

export const scrollToTop = () => {
	window.scrollTo({
		top: 0,
		behavior: 'smooth',
	});
};

export const scrollToLastUserMessage = () => {
	const elems = document.getElementsByClassName('msg-user');
	if (elems.length > 0) {
		const last = elems[elems.length - 1];
		const rect = last.getBoundingClientRect();
		const dy = rect.top - 54;
		if (dy > 0) {
			// current scroll position
			window.scrollTo({
				top: window.scrollY + dy,
				behavior: 'smooth',
			});
		}
	}
};
