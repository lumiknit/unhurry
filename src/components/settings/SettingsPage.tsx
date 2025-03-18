import {
	Component,
	createEffect,
	createSignal,
	For,
	Match,
	Switch,
} from 'solid-js';
import { toast } from 'solid-toast';

import { UserConfig } from '@lib/config';

import { getUserConfig, setUserConfig } from '@store';

import ModelList from './ModelList';
import TagList from './TagList';
import Xxport from './Xxport';

interface NumConfigProps {
	key: keyof UserConfig;
	label: string;
	desc: string;
}

const NumConfig: Component<NumConfigProps> = (props) => {
	let inputRef: HTMLInputElement;
	const handleChange = () => {
		const value = Number(inputRef!.value);
		setUserConfig((c) => ({
			...c,
			[props.key]: value,
		}));
	};

	createEffect(() => {
		const c = getUserConfig();
		if (c) {
			const v = Number(c[props.key]);
			if (isNaN(v)) return;
			inputRef!.value = String(v);
		}
	});

	return (
		<div class="field">
			<label class="label">{props.label}</label>
			<div class="control">
				<input
					ref={inputRef!}
					class="input"
					type="number"
					placeholder={props.label}
					onChange={handleChange}
				/>
			</div>
			<p class="help">{props.desc}</p>
		</div>
	);
};

interface CheckboxConfigProps {
	key: keyof UserConfig;
	label: string;
	desc: string;
}

const CheckboxConfig: Component<CheckboxConfigProps> = (props) => {
	const [checked, setChecked] = createSignal(false);

	const handleChange = () => {
		const newValue = !checked();
		setChecked(newValue);
		setUserConfig((c) => ({
			...c,
			[props.key]: newValue,
		}));
	};

	createEffect(() => {
		const c = getUserConfig();
		if (c) {
			const v = Boolean(c[props.key]);
			setChecked(v);
		}
	});

	return (
		<div class="field">
			<label class="label">{props.label}</label>
			<label class="checkbox">
				<input
					type="checkbox"
					checked={checked()}
					onChange={handleChange}
				/>
				{props.label}
			</label>
			<p class="help">{props.desc}</p>
		</div>
	);
};

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
