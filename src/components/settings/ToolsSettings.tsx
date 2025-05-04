import { Component, For } from 'solid-js';
import { toast } from 'solid-toast';

import { getFnTools } from '@/lib/chat/tools';
import { getUserConfig, setUserConfig } from '@/store/config';

import SwitchForm from './form/SwitchForm';

const ToolsSettings: Component = () => {
	const fnTools = getFnTools({});

	const toolEnabled = (toolName: string) => {
		const v = !getUserConfig()?.tools[toolName]?.disabled;
		return v;
	};

	const setToolEnabled = (toolName: string, enabled: boolean) => {
		setUserConfig((c) => {
			const tools = c.tools || {};
			const toolConfig = tools[toolName] || {};
			tools[toolName] = {
				...toolConfig,
				disabled: !enabled,
			};
			return {
				...c,
				tools,
			};
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
