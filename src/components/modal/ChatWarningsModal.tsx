import { For } from 'solid-js';

import Buttons from '@/components/utils/Buttons';

import { openModal } from './ModalContainer';

export const openChatWarningsModal = (warnings: string[]) => {
	type Props = {
		onClose: () => void;
	};
	const component = (props: Props) => {
		return (
			<div class="box">
				<ul>
					<For each={warnings}>{(warning) => <li>{warning}</li>}</For>
				</ul>
				<div class="buttons is-right">
					<Buttons
						autofocus
						onEscape={() => props.onClose()}
						buttons={[
							{
								class: 'button is-danger',
								label: 'Close',
								onClick: () => props.onClose(),
							},
						]}
					/>
				</div>
			</div>
		);
	};

	return openModal(component);
};
