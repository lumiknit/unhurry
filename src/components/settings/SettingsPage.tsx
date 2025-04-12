import { Component, createSignal, For } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import GeneralSettings from './GeneralSettings';
import ModelList from './ModelList';
import TagList from './TagList';
import ToolsSettings from './ToolsSettings';
import Xxport from './Xxport';

type TabID = 'general' | 'models' | 'prompt-tags' | 'tools' | 'im-export';
type TabItem = {
	id: TabID;
	label: string;
};

const tabs: TabItem[] = [
	{ id: 'general', label: 'General' },
	{ id: 'models', label: 'Models' },
	{ id: 'prompt-tags', label: 'Prompt Tags' },
	{ id: 'tools', label: 'Tools' },
	{ id: 'im-export', label: 'Im/Export' },
];

const tabComponents = new Map<TabID, Component>([
	['general', GeneralSettings],
	['models', ModelList],
	['prompt-tags', TagList],
	['tools', ToolsSettings],
	['im-export', Xxport],
]);

const SettingsPage: Component = () => {
	const query = new URLSearchParams(window.location.search);
	let initialTab = query.get('tab') as TabID;
	if (!tabComponents.has(initialTab)) {
		initialTab = 'general';
	}
	const [activeTab, setActiveTab] = createSignal<TabID>(initialTab);

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
										'is-active': tab.id === activeTab(),
									}}
								>
									<a onClick={() => setActiveTab(tab.id)}>
										{tab.label}
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
