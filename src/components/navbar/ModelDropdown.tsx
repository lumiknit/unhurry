import { Component, For } from 'solid-js';

import { getUserConfig, setUserConfig } from '../../store';

const ModelDropdown: Component = () => {
	const models = () => getUserConfig()?.models || [];
	const selected = () => getUserConfig()?.currentModelIdx || 0;

	const handleSelect = (idx: number) => {
		setUserConfig((c) => ({
			...c,
			currentModelIdx: idx,
		}));
	};

	return (
		<div class="select">
			<select onChange={(e) => handleSelect(Number(e.target.value))}>
				<For each={models()}>
					{(m, i) => (
						<option selected={i() === selected()} value={i()}>
							{m.name}
						</option>
					)}
				</For>
			</select>
		</div>
	);
};

export default ModelDropdown;
