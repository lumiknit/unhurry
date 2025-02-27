import { Component, For } from 'solid-js';

import { getUserConfig, setUserConfig } from '../../store';

const ModelDropdown: Component<any> = () => {
	const models = () => getUserConfig()?.models || [];
	const selected = () => getUserConfig()?.currentModelIdx || 0;

	const handleSelect = (idx: number) => () => {
		console.log('Selected', idx);
		setUserConfig((c) => ({
			...c,
			currentModelIdx: idx,
		}));
	};

	return (
		<div class="select">
			<select>
				<For each={models()}>
					{(m, i) => (
						<option
							selected={i() === selected()}
							onSelect={handleSelect(i())}
						>
							{m.name}
						</option>
					)}
				</For>
			</select>
		</div>
	);
};

export default ModelDropdown;
