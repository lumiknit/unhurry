import Buttons from '@/components/utils/Buttons';

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
					<Buttons
						autofocus
						onEscape={() => props.onClose(false)}
						buttons={[
							{
								class: 'button is-danger',
								label: 'OK',
								onClick: () => props.onClose(true),
							},
							{
								class: 'button',
								label: 'Cancel',
								onClick: () => props.onClose(false),
							},
						]}
					/>
				</div>
			</div>
		);
	};

	return openModal(component);
};
