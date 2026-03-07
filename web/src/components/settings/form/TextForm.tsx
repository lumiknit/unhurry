import {
	Accessor,
	Component,
	createEffect,
	For,
	Match,
	Show,
	Switch,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { Color } from '@/lib/config';

export interface Option {
	label: string;
	value: string;
	icon?: Component;
	color?: Color;
}

interface Props {
	label: string;
	desc: string;
	options?: false | Option[];
	onLoadOptions?: () => void;

	get: Accessor<string>;
	set: (v: string) => void;

	controlClass?: string;
	placeholder?: string;
}

/**
 * Form with a text input.
 */
const TextForm: Component<Props> = (props) => {
	let inputRef: HTMLInputElement;

	const handleChange = () => {
		props.set(inputRef!.value);
	};

	const handleOptionClick = (opt: Option) => {
		inputRef!.value = opt.value;
		props.set(opt.value);
	};

	createEffect(() => {
		inputRef!.value = props.get();
	});

	return (
		<div class="mb-4">
			<label class="is-flex flex-split gap-2">
				<div>
					<div class="label mb-0">{props.label}</div>
					<p class="help">{props.desc}</p>
				</div>

				<div class={'control ' + (props.controlClass || '')}>
					<input
						ref={inputRef!}
						class="input"
						type="text"
						placeholder={props.placeholder || props.label}
						onChange={handleChange}
					/>
				</div>
			</label>
			<div>
				<Switch>
					<Match when={props.options === false}>
						<div>
							<button
								class="tag mr-1"
								onClick={() => props.onLoadOptions?.()}
							>
								...
							</button>
						</div>
					</Match>
					<Match when={props.options !== undefined}>
						<div class="flex flex-wrap">
							<For each={props.options!}>
								{(opt) => (
									<button
										class={
											'tag mr-1 is-' + (opt.color || '')
										}
										onClick={() => handleOptionClick(opt)}
									>
										<Show when={opt.icon}>
											<span class="icon">
												<Dynamic component={opt.icon} />
											</span>
										</Show>
										{opt.label}
									</button>
								)}
							</For>
						</div>
					</Match>
				</Switch>
			</div>
		</div>
	);
};

export default TextForm;
