import { Component, createEffect } from 'solid-js';

import { UserConfig } from '@/lib/config';
import { configStore, setConfigStore } from '@/features/settings/store';

interface NumConfigProps {
	key: keyof UserConfig;
	label: string;
	desc: string;
}

const NumConfig: Component<NumConfigProps> = (props) => {
	let inputRef: HTMLInputElement;
	const handleChange = () => {
		const value = Number(inputRef!.value);
		setConfigStore(props.key as any, value as any);
	};

	createEffect(() => {
		const v = Number(configStore[props.key]);
		if (isNaN(v)) return;
		inputRef!.value = String(v);
	});

	return (
		<label class="is-flex flex-split mb-4">
			<div>
				<div class="label mb-0">{props.label}</div>
				<p class="help">{props.desc}</p>
			</div>

			<div class="control">
				<input
					ref={inputRef!}
					class="input"
					type="number"
					placeholder={props.label}
					onChange={handleChange}
				/>
			</div>
		</label>
	);
};

export default NumConfig;
