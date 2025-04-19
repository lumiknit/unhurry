import { Component } from 'solid-js';

import { openModal } from '.';

export const openSample = () => {
	type Props = {
		id: string;
		onClose: (value?: string) => void;
	};
	const component: Component<Props> = (props) => {
		return (
			<div>
				id: {props.id}
				<button class="button is-danger" onClick={openSample}>
					One more
				</button>
				<button
					class="button is-danger"
					onClick={() => props.onClose('hello world')}
				>
					Close
				</button>
			</div>
		);
	};

	console.log('asd');

	return openModal(component);
};
