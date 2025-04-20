import { createSignal, onMount } from 'solid-js';

import { getBEService } from '@/lib/be';

import { openModal } from './ModalContainer';

export const openQRModal = (value: string) => {
	type Props = {
		onClose: (value: boolean) => void;
	};
	const component = (props: Props) => {
		const [svg, setSVG] = createSignal<string>('');

		onMount(async () => {
			const be = await getBEService();
			const s = await be.genQRSVG(value);
			setSVG(s);
		});

		return (
			<div class="box">
				<div class="has-text-centered modal-qr-content">
					<div class="modal-qr-code" innerHTML={svg()} />
					{value}
				</div>
				<div class="buttons is-right">
					<button class="button" onClick={() => props.onClose(false)}>
						Close
					</button>
				</div>
			</div>
		);
	};

	return openModal(component);
};
