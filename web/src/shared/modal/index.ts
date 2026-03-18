export const openConfirm = (message: string): Promise<boolean> => {
	return Promise.resolve(window.confirm(message));
};
