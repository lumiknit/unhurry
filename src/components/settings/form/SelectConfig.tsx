import { Component, createEffect, For } from 'solid-js';

import { UserConfig } from '@/lib/config';
import { getUserConfig, setUserConfig } from '@/store';

interface SelectConfigProps {
	key: keyof UserConfig;
	label: string;
	desc: string;
	options: { value: string; label: string }[];
}

const SelectConfig: Component<SelectConfigProps> = (props) => {
	let selectRef: HTMLSelectElement;

	const handleChange = () => {
		const value = selectRef!.value;
		setUserConfig((c) => ({
			...c,
			[props.key]: value,
		}));
	};

	createEffect(() => {
		const c = getUserConfig();
		if (c) {
			const v = String(c[props.key]);
			selectRef!.value = v;
		}
	});

	return (
		<div class="field">
			<label class="label">{props.label}</label>
			<div class="control">
				<div class="select">
					<select ref={selectRef!} onChange={handleChange}>
						<For each={props.options}>
							{(option) => (
								<option value={option.value}>
									{option.label}
								</option>
							)}
						</For>
					</select>
				</div>
			</div>
			<p class="help">{props.desc}</p>
		</div>
	);
};

export default SelectConfig;
