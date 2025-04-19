import { Component, createSignal, For, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { uniqueID } from '@/lib/utils';

/**
 * Common properties for all modals.
 */
export type ModalProps<T> = {
	/**
	 * ID of modal, used to query modal
	 */
	id: string;

	/**
	 * Modal can call this function to close itself.
	 * The value will be passed to resolve function, to return the value to the caller.
	 */
	onClose: (value?: T) => void;
};

/**
 * Internal state of modal.
 */
type ModalState<T> = {
	id: string;
	resolve: (value?: T) => void;
	reject: (reason: Error) => void;

	component: Component<ModalProps<T>>;
};

const [modalState, setModalState] = createSignal<ModalState<unknown>[]>([]);

export const closeModal = (id: string) => {
	const modal = modalState().find((m) => m.id === id);
	if (modal) {
		modal.resolve();
		setModalState((prev) => prev.filter((m) => m.id !== id));
	}
};

export function openModal<T>(
	component: Component<ModalProps<T>>
): Promise<T | undefined> {
	return new Promise((resolve, reject) => {
		const id = uniqueID();
		const state: ModalState<T> = {
			id,
			resolve,
			reject,
			component,
		};
		setModalState((prev) => [...prev, state as ModalState<unknown>]);
	});
}

const ModalItem: Component<{
	modal: ModalState<unknown>;
	isLast: () => boolean;
}> = (props) => {
	const handleClose = (value?: unknown) => {
		props.modal.resolve(value);
		setModalState((prev) => prev.filter((m) => m.id !== props.modal.id));
	};
	return (
		<div class="modal is-active">
			<Show when={props.isLast()}>
				<div class="modal-background" onClick={handleClose} />
			</Show>
			<div class="modal-content p-4">
				<Dynamic
					component={props.modal.component}
					id={props.modal.id}
					onClose={handleClose}
				/>
			</div>
			<button
				class="modal-close is-large"
				aria-label="close"
				onClick={handleClose}
			></button>
		</div>
	);
};

const ModalContainer: Component = () => {
	return (
		<>
			<For each={modalState()}>
				{(modal, idx) => {
					return (
						<ModalItem
							modal={modal}
							isLast={() => idx() === modalState().length - 1}
						/>
					);
				}}
			</For>
		</>
	);
};

export default ModalContainer;
