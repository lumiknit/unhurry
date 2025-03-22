import { Component, createEffect } from 'solid-js';

import { UserConfig } from '@/lib/config';
import { getUserConfig, setUserConfig } from '@/store';

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

export default NumConfig;
