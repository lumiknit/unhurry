import { createStore } from 'solid-js/store';

type ConfirmModalState = {
	isOpen: boolean;
	message: string;

	closeResolve?: (value: boolean) => void;
};

const [store, setStore] = createStore<ConfirmModalState>({
	isOpen: false,
	message: '',
});

export const getConfirmMessage = (): string | undefined => {
	return store.isOpen ? store.message : undefined;
};

export const closeConfirm = (value: boolean) => {
	store.closeResolve?.(value);
};

export const openConfirm = (message: string) =>
	new Promise<boolean>((resolve) => {
		setStore({
			isOpen: true,
			message,
			closeResolve: (value) => {
				resolve(value);
				setStore('isOpen', false);
			},
		});
	});
