import { Component, createSignal, For } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import GeneralSettings from './GeneralSettings';
import ModelList from './ModelList';
import TagList from './TagList';
import ToolsSettings from './ToolsSettings';
import Xxport from './Xxport';

type Tab = 'General' | 'Models' | 'Prompt Tags' | 'Tools' | 'Im/Export';
const tabs: Tab[] = ['General', 'Models', 'Prompt Tags', 'Tools', 'Im/Export'];

const tabComponents = new Map<Tab, Component>([
	['General', GeneralSettings],
	['Models', ModelList],
	['Prompt Tags', TagList],
	['Tools', ToolsSettings],
	['Im/Export', Xxport],
]);

const SettingsPage: Component = () => {
	const [activeTab, setActiveTab] = createSignal<Tab>('General');

	return (
		<div class="container">
			<div class="px-2">
				<h1 class="title is-3">Settings</h1>

				<div class="tabs">
					<ul>
						<For each={tabs}>
							{(tab) => (
								<li
									classList={{
										'is-active': tab === activeTab(),
									}}
								>
									<a onClick={() => setActiveTab(tab)}>
										{tab}
									</a>
								</li>
							)}
						</For>
					</ul>
				</div>

				<Dynamic component={tabComponents.get(activeTab())} />
			</div>
		</div>
	);
};

export default SettingsPage;
