import { Accessor, Component, createEffect } from 'solid-js';

interface Props {
	label: string;
	desc: string;
	onLoadOptions?: () => void;

	get: Accessor<string>;
	set: (v: string) => void;

	rows?: number;

	controlClass?: string;
	placeholder?: string;
}

/**
 * Form with a text input.
 */
const TextareaForm: Component<Props> = (props) => {
	let taRef: HTMLTextAreaElement;

	const handleChange = () => {
		props.set(taRef!.value);
	};

	createEffect(() => {
		taRef!.value = props.get();
	});

	return (
		<div class="mb-4">
			<label>
				<div>
					<div class="label mb-0">{props.label}</div>
					<p class="help">{props.desc}</p>
				</div>

				<div class={'control ' + (props.controlClass || '')}>
					<textarea
						ref={taRef!}
						class="textarea"
						placeholder={props.placeholder || props.label}
						onChange={handleChange}
						rows={props.rows}
					/>
				</div>
			</label>
		</div>
	);
};

export default TextareaForm;
