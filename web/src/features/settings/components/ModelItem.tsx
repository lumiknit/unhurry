import {
	BiRegularUpArrow,
	BiRegularDownArrow,
	BiRegularTrash,
} from 'solid-icons/bi';
import { Component, For, Show } from 'solid-js';

import { configStore } from '@/features/settings/store';

import { ModelConfig, ToolCallStyle } from '@lib/config';
import { getWellKnownModelOpts } from '@lib/llm';

import NumForm from './form/NumForm';
import SelectForm from './form/SelectForm';
import TextForm from './form/TextForm';

interface Props {
	model: ModelConfig;
	idx: number;
	onUpdate: (m: ModelConfig) => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onDelete: () => void;
}

const ModelItem: Component<Props> = (props) => {
	const providers = () => configStore.providers || [];

	const selectedProvider = () =>
		providers().find((p) => p.id === props.model.providerId);

	const handleModelChange = (model: string) => {
		const opts = getWellKnownModelOpts(model) ?? {};
		props.onUpdate({ ...props.model, ...opts, model });
	};

	const displayName = () =>
		props.model.name ||
		(selectedProvider()
			? `${selectedProvider()!.name} / ${props.model.model}`
			: props.model.model || '(unnamed)');

	return (
		<>
			<div class="mb-4" />

			<h4 class="title is-4">
				{props.idx + 1}. {displayName()}
			</h4>

			<div class="has-text-right mb-4">
				<button
					class="button is-small is-primary mr-1"
					onClick={props.onMoveUp}
				>
					<span class="icon">
						<BiRegularUpArrow />
					</span>
				</button>
				<button
					class="button is-small is-primary mr-1"
					onClick={props.onMoveDown}
				>
					<span class="icon">
						<BiRegularDownArrow />
					</span>
				</button>
				<button
					class="button is-small is-danger"
					onClick={props.onDelete}
				>
					<span class="icon">
						<BiRegularTrash />
					</span>
					<span>Delete</span>
				</button>
			</div>

			<div class="field mb-4">
				<label class="label mb-1">Provider</label>
				<Show
					when={providers().length > 0}
					fallback={
						<p class="help has-text-warning">
							No providers configured. Add one in the Providers
							tab.
						</p>
					}
				>
					<div class="flex flex-wrap">
						<For each={providers()}>
							{(p) => (
								<button
									class={
										'button is-small mr-1 mb-1' +
										(props.model.providerId === p.id
											? ' is-primary'
											: '')
									}
									onClick={() =>
										props.onUpdate({
											...props.model,
											providerId: p.id,
										})
									}
								>
									{p.name}
								</button>
							)}
						</For>
					</div>
				</Show>
			</div>

			<TextForm
				label="Model"
				desc="Model name string (e.g. gpt-4o, claude-3-7-sonnet-latest)"
				controlClass="flex-1 maxw-75"
				get={() => props.model.model}
				set={(v) => handleModelChange(v)}
			/>

			<TextForm
				label="Display Name"
				desc="Optional display name (defaults to provider/model)"
				controlClass="flex-1 maxw-75"
				get={() => props.model.name || ''}
				set={(v) =>
					props.onUpdate({ ...props.model, name: v || undefined })
				}
			/>

			<div class="field">
				<label class="label">Additional System Prompt</label>
				<div class="control">
					<textarea
						class="textarea"
						value={props.model.systemPrompt || ''}
						onChange={(e) =>
							props.onUpdate({
								...props.model,
								systemPrompt: e.currentTarget.value,
							})
						}
					/>
				</div>
			</div>

			<SelectForm
				label="ToolCall Style"
				desc="How tool calls are formatted"
				options={[
					{ label: 'Built-In', value: 'builtin' },
					{ label: 'Gemma', value: 'gemma' },
				]}
				get={() => props.model.toolCallStyle || 'builtin'}
				set={(v) =>
					props.onUpdate({
						...props.model,
						toolCallStyle: v as ToolCallStyle,
					})
				}
			/>

			<NumForm
				label="Context Size"
				desc="Max context tokens (0 = default)"
				get={() => props.model.contextLength || 0}
				set={(v) =>
					props.onUpdate({
						...props.model,
						contextLength: v || undefined,
					})
				}
			/>

			<NumForm
				label="Max Output"
				desc="Max output tokens (0 = default)"
				get={() => props.model.maxOutputTokens || 0}
				set={(v) =>
					props.onUpdate({
						...props.model,
						maxOutputTokens: v || undefined,
					})
				}
			/>

			<TextForm
				label="Think Start"
				desc="Token that opens a reasoning block"
				controlClass="flex-1 maxw-75"
				get={() => props.model.thinkOpen || ''}
				set={(v) =>
					props.onUpdate({
						...props.model,
						thinkOpen: v || undefined,
					})
				}
			/>

			<TextForm
				label="Think End"
				desc="Token that closes a reasoning block"
				controlClass="flex-1 maxw-75"
				get={() => props.model.thinkClose || ''}
				set={(v) =>
					props.onUpdate({
						...props.model,
						thinkClose: v || undefined,
					})
				}
			/>
		</>
	);
};

export default ModelItem;
