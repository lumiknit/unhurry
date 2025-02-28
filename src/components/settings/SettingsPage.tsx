import { Component, createEffect } from 'solid-js';

import ModelList from './ModelList';
import { UserConfig } from '../../lib/config';
import { getUserConfig, setUserConfig } from '../../store';

type NumConfigProps = {
	key: keyof UserConfig;
	label: string;
	desc: string;
};

const NumConfig: Component<NumConfigProps> = (props) => {
	let inputRef: HTMLInputElement;
	const handleChange = () => {
		const value = Number(inputRef!.value);
		console.log(value);
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

const SettingsPage: Component = () => {
	return (
		<div class="container">
			<h1 class="title is-3">Settings</h1>

			<h2 class="title is-4">General</h2>

			<NumConfig
				key="autoSendMillis"
				label="Auto Send After (ms)"
				desc="When send the typed text to the server automatically"
			/>

			<ModelList />
		</div>
	);
};

export default SettingsPage;
