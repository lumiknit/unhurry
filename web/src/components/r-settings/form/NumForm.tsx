import { Component, createEffect } from 'solid-js';

interface Props {
	label: string;
	desc: string;

	get: () => number;
	set: (value: number) => void;

	min?: number;
	max?: number;
	step?: number;
}

const NumForm: Component<Props> = (props) => {
	let inputRef: HTMLInputElement;

	const handleChange = () => {
		props.set(Number(inputRef!.value));
	};

	createEffect(() => {
		inputRef!.value = String(props.get());
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
					min={props.min}
					max={props.max}
					step={props.step}
					placeholder={props.label}
					onChange={handleChange}
				/>
			</div>
		</label>
	);
};

export default NumForm;
