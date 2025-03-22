import { Component, createEffect, createSignal } from 'solid-js';

import { UserConfig } from '@/lib/config';
import { getUserConfig, setUserConfig } from '@/store';

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

export default CheckboxConfig;
