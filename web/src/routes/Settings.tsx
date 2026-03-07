import { useNavigate } from '@solidjs/router';
import { Component, createSignal, onMount } from 'solid-js';
import { toast } from 'solid-toast';

import { loadUserConfig, saveUserConfig } from '../lib/db/dbs';
import './Settings.scss';

interface ConfigType {
	openaiApiKey?: string;
}

const Settings: Component = () => {
	const navigate = useNavigate();
	const [apiKey, setApiKey] = createSignal('');

	onMount(async () => {
		const config = await loadUserConfig<ConfigType>();
		if (config.openaiApiKey) {
			setApiKey(config.openaiApiKey);
		}
	});

	const handleConfigSave = async () => {
		const config = await loadUserConfig<ConfigType>();
		config.openaiApiKey = apiKey();
		await saveUserConfig(config);
		toast.success('API Key saved to IndexedDB!');
		navigate('/');
	};

	return (
		<div class="settings-page">
			<div class="settings-card">
				<h2 class="settings-title">Settings</h2>
				<div class="settings-field">
					<label class="settings-label">OpenAI API Key</label>
					<input
						type="password"
						value={apiKey()}
						onInput={(e) => setApiKey(e.currentTarget.value)}
						class="settings-input"
						placeholder="sk-..."
					/>
				</div>
				<button onClick={handleConfigSave} class="settings-button">
					Save & Start Back to Chat
				</button>
			</div>
		</div>
	);
};

export default Settings;
