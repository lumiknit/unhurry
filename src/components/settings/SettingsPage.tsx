import { Component, createSignal, For, Match, Switch } from 'solid-js';
import { toast } from 'solid-toast';

import CheckboxConfig from './form/CheckboxConfig';
import NumConfig from './form/NumConfig';
import SelectConfig from './form/SelectConfig';
import ModelList from './ModelList';
import TagList from './TagList';
import Xxport from './Xxport';

type Tab = 'General' | 'Models' | 'Prompt Tags' | 'Im/Export';
const tabs: Tab[] = ['General', 'Models', 'Prompt Tags', 'Im/Export'];

const SettingsPage: Component = () => {
	const [activeTab, setActiveTab] = createSignal<Tab>('General');

	const forceRemoveServiceWorker = () => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.getRegistrations().then((registrations) => {
				registrations.forEach((r) => r.unregister());
			});
			toast.success('ServiceWorker removed');
		} else {
			toast.error('ServiceWorker not supported');
		}
	};

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
						<NumConfig
							key="autoSendMillis"
							label="Auto Send After (ms)"
							desc="When send the typed text to the server automatically"
						/>

						<CheckboxConfig
							key="enableLLMFallback"
							label="Enable LLM Fallback"
							desc="When LLM failed (e.g. 429 Too Many Requests), use the next model"
						/>

						<CheckboxConfig
							key="enableVibration"
							label="Enable device vibration"
							desc="Enable vibration feedback for buttons. Only works on Android."
						/>

						<SelectConfig
							key="fontFamily"
							label="Font Family"
							desc="Font family of the chat messages"
							options={[
								{ value: 'sans-serif', label: 'Sans-serif' },
								{ value: 'serif', label: 'Serif' },
							]}
						/>

						<h2 class="title is-4">Remove service workers</h2>
						<p>
							If your webpage does not work properly, clear
							service workers
						</p>
						<button
							class="button is-danger"
							onClick={forceRemoveServiceWorker}
						>
							Remove Service Workers
						</button>
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
