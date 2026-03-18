import { Component } from 'solid-js';

interface Props {
	label: string;
	value: string;
}

/**
 * CodeForm component
 * This object just shows a label and a code
 */
const CodeForm: Component<Props> = (props) => {
	return (
		<div class="mb-4">
			<label class="is-flex flex-split gap-2">
				<div>
					<div class="label mb-0">{props.label}</div>
				</div>
				<code>{props.value}</code>
			</label>
		</div>
	);
};

export default CodeForm;
