import { Component, createSignal, For, Match, Switch } from 'solid-js';

import GeneralSettings from './GeneralSettings';
import ModelList from './ModelList';
import TagList from './TagList';
import Xxport from './Xxport';

type Tab = 'General' | 'Models' | 'Prompt Tags' | 'Im/Export';
const tabs: Tab[] = ['General', 'Models', 'Prompt Tags', 'Im/Export'];

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

				<Switch>
					<Match when={activeTab() === 'General'}>
						<GeneralSettings />
					</Match>

					<Match when={activeTab() === 'Models'}>
						<ModelList />
					</Match>

					<Match when={activeTab() === 'Prompt Tags'}>
						<TagList />
					</Match>

					<Match when={activeTab() === 'Im/Export'}>
						<Xxport />
					</Match>
				</Switch>
			</div>
		</div>
	);
};

export default SettingsPage;
