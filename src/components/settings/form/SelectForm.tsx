import { Accessor, Component, createEffect, For } from 'solid-js';

interface Props {
	label: string;
	desc: string;
	options: { value: string; label: string }[];
	selectClass?: string;

	get: Accessor<string>;
	set: (v: string) => void;
}

const SelectForm: Component<Props> = (props) => {
	let selectRef: HTMLSelectElement;

	const handleChange = () => {
		props.set(selectRef!.value);
	};

	createEffect(() => {
		selectRef!.value = props.get();
	});

	return (
		<label class="is-flex flex-split mb-4">
			<div>
				<div class="label mb-0">{props.label}</div>
				<p class="help">{props.desc}</p>
			</div>

			<div class="control">
				<div class={'select ' + (props.selectClass || '')}>
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
		</label>
	);
};

export default SelectForm;
