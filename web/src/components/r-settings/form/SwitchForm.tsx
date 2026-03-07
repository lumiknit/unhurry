import { Accessor, Component, createEffect, createSignal } from 'solid-js';

interface Props {
	label: string;
	desc: string;

	get: Accessor<boolean>;
	set: (v: boolean) => void;
}

/**
 * Form with a switch input.
 * It can be used for checkbox.
 */
const SwitchForm: Component<Props> = (props) => {
	const [checked, setChecked] = createSignal(false);

	const handleChange = (e: Event) => {
		props.set((e.target as HTMLInputElement).checked);
	};

	createEffect(() => {
		setChecked(props.get());
	});

	return (
		<label class="is-flex flex-split mb-4">
			<div>
				<div class="label mb-0">{props.label}</div>
				<p class="help">{props.desc}</p>
			</div>

			<div class="switch is-rounded">
				<input
					type="checkbox"
					checked={checked()}
					onChange={handleChange}
				/>
				<span class="check" />
			</div>
		</label>
	);
};

export default SwitchForm;
