import { openModal } from './ModalContainer';

export const openConfirm = (message: string) => {
	type Props = {
		onClose: (value: boolean) => void;
	};
	const component = (props: Props) => {
		return (
			<div class="box">
				<p>{message}</p>
				<div class="buttons is-right">
					<button
						class="button is-danger"
						onClick={() => props.onClose(true)}
					>
						OK
					</button>
					<button class="button" onClick={() => props.onClose(false)}>
						Cancel
					</button>
				</div>
			</div>
		);
	};

	return openModal(component);
};
