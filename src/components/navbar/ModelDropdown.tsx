import { Component, createEffect, createSignal, For } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { llmPresets } from '@/lib/llm';

import { getUserConfig, setUserConfig } from '@store';

import { getAIIconComponent } from '../utils/icons/AIIcons';

const ModelDropdown: Component = () => {
	const models = () => getUserConfig()?.models || [];
	const selected = () => getUserConfig()?.currentModelIdx || 0;

	const getIcon = (endpoint: string) => {
		const preset = llmPresets.find((p) => p.endpoint === endpoint);
		if (!preset) return undefined;
		return getAIIconComponent(preset.name);
	};

	const [icon, setIcon] = createSignal<Component | undefined>();

	const handleSelect = (idx: number) => {
		setUserConfig((c) => ({
			...c,
			currentModelIdx: idx,
		}));
		const endpoint = models()[idx]?.endpoint || '';
		setIcon(() => getIcon(endpoint));
	};

	createEffect(() => {
		const endpoint = models()[selected()]?.endpoint || '';
		setIcon(() => getIcon(endpoint));
	});

	return (
		<div class="control has-icons-left">
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
			<span class="icon is-left">
				<Dynamic component={icon()} />
			</span>
		</div>
	);
};

export default ModelDropdown;
