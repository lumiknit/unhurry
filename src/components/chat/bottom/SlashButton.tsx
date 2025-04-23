import { TbArrowBigRightLinesFilled, TbClockShare } from 'solid-icons/tb';
import { Component, createSignal, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { createIsMobile } from '@/components/utils/media';
import {
	getUphurryMode,
	getUserConfig,
	setUphurryMode,
	setUserConfig,
} from '@/store';

const SlashButton: Component = () => {
	const isMobile = createIsMobile();
	const [isOpen, setIsOpen] = createSignal(false);

	const toggleDropdown = () => setIsOpen(!isOpen());

	const toggleUphurry = () => {
		const v = setUphurryMode((s) => !s);
		if (v) {
			toast('Uphurry ON!');
		} else {
			toast('Uphurry OFF!');
		}
	};

	const toggleAutoSend = () => {
		const v = setUserConfig((c) => ({
			...c,
			enableAutoSend: !c.enableAutoSend,
		}));
		if (v.enableAutoSend) {
			toast('AutoSend ON!');
		} else {
			toast('AutoSend OFF!');
		}
	};

	return (
		<div class={`dropdown ${isOpen() ? 'is-active' : ''} is-up`}>
			<div class="dropdown-trigger">
				<button
					class="tag h-full"
					aria-haspopup="true"
					aria-controls="dropdown-menu"
					onClick={toggleDropdown}
				>
					<span class="icon">/</span>
					<Show when={!isMobile()}>
						<span>Slash</span>
					</Show>
				</button>
			</div>
			<div class="dropdown-menu" id="dropdown-menu" role="menu">
				<div class="dropdown-content">
					<a class="dropdown-item" href="#" onClick={toggleUphurry}>
						<TbArrowBigRightLinesFilled />
						<span>Uphurry ({getUphurryMode() ? 'ON' : 'OFF'})</span>
					</a>
					<a class="dropdown-item" href="#" onClick={toggleAutoSend}>
						<TbClockShare />
						<span>
							AutoSend (
							{getUserConfig()?.enableAutoSend ? 'ON' : 'OFF'})
						</span>
					</a>
				</div>
			</div>
		</div>
	);
};

export default SlashButton;
