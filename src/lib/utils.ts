/**
 * Generate long unique ID, which only contains alphanum and underscore.
 */
export const uniqueID = (): string => {
	const now = Date.now().toString(36);
	const rand = Math.random().toString(36).slice(2);
	return now + rand;
};
