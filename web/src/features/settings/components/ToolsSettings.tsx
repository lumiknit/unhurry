import { Component, For } from 'solid-js';
import { toast } from 'solid-toast';

import { configStore, setConfigStore } from '@/features/settings/store';
import { getFnTools } from '@/lib/chat/tools';

import SwitchForm from './form/SwitchForm';

const ToolsSettings: Component = () => {
	const fnTools = getFnTools({});

	const toolEnabled = (toolName: string) => {
		return !configStore.tools[toolName]?.disabled;
	};

	const setToolEnabled = (toolName: string, enabled: boolean) => {
		setConfigStore('tools', toolName, {
			...configStore.tools[toolName],
			disabled: !enabled,
		});
	};

	return (
		<>
			<h4 class="title is-4">Tool Configuration</h4>

			<For each={fnTools}>
				{(tool) => {
					return (
						<SwitchForm
							label={tool.name}
							desc={tool.description}
							get={() => toolEnabled(tool.name)}
							set={(v) => {
								setToolEnabled(tool.name, v);
								toast.success(
									`Tool ${tool.name} ${v ? 'enabled' : 'disabled'}`
								);
							}}
						/>
					);
				}}
			</For>
		</>
	);
};

export default ToolsSettings;
