import { BiRegularTrash } from 'solid-icons/bi';
import { Component, For, Show } from 'solid-js';

import {
	providerKinds,
	providerKindLabel,
	ProviderConfig,
	ProviderKind,
} from '@lib/config';
import { providerPresets } from '@lib/llm';

import TextForm from './form/TextForm';

interface Props {
	provider: ProviderConfig;
	idx: number;
	onUpdate: (p: ProviderConfig) => void;
	onDelete: () => void;
}

const ProviderItem: Component<Props> = (props) => {
	const preset = () => providerPresets[props.provider.kind];

	const handleKindChange = (kind: ProviderKind) => {
		props.onUpdate({
			...props.provider,
			kind,
			name: providerKindLabel(kind),
			baseURL: undefined,
		});
	};

	return (
		<>
			<div class="mb-4" />

			<h4 class="title is-4">
				{props.idx + 1}. {props.provider.name}
			</h4>

			<div class="has-text-right mb-4">
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
				<label class="label mb-1">Kind</label>
				<div class="flex flex-wrap">
					<For each={providerKinds}>
						{(kind) => (
							<button
								class={
									'button is-small mr-1 mb-1' +
									(props.provider.kind === kind
										? ' is-primary'
										: '')
								}
								onClick={() => handleKindChange(kind)}
							>
								{providerKindLabel(kind)}
							</button>
						)}
					</For>
				</div>
			</div>

			<TextForm
				label="Name"
				desc="Display name for this provider"
				controlClass="flex-1 maxw-75"
				get={() => props.provider.name}
				set={(v) => props.onUpdate({ ...props.provider, name: v })}
			/>

			<TextForm
				label="Base URL"
				desc={
					'API base URL' +
					(preset()?.defaultBaseURL
						? ` (default: ${preset()!.defaultBaseURL})`
						: '')
				}
				controlClass="flex-1 maxw-75"
				placeholder={preset()?.defaultBaseURL || ''}
				get={() => props.provider.baseURL || ''}
				set={(v) =>
					props.onUpdate({
						...props.provider,
						baseURL: v || undefined,
					})
				}
			/>

			<TextForm
				label="API Key"
				desc={
					preset()?.apiKeyURL
						? `Get your key: ${preset()!.apiKeyURL}`
						: ''
				}
				controlClass="flex-1 maxw-75"
				get={() => props.provider.apiKey || ''}
				set={(v) =>
					props.onUpdate({
						...props.provider,
						apiKey: v || undefined,
					})
				}
			/>

			<Show when={props.provider.kind === 'anthropic'}>
				<div class="field mb-4">
					<label class="label mb-1">API Key Type</label>
					<div class="flex">
						<For each={['apiKey', 'authToken'] as const}>
							{(t) => (
								<button
									class={
										'button is-small mr-1' +
										((props.provider.apiKeyType ||
											'apiKey') === t
											? ' is-primary'
											: '')
									}
									onClick={() =>
										props.onUpdate({
											...props.provider,
											apiKeyType: t,
										})
									}
								>
									{t}
								</button>
							)}
						</For>
					</div>
				</div>
			</Show>

			<Show when={preset()?.apiKeyURL}>
				<div class="mb-4">
					<a
						class="is-size-7"
						target="_blank"
						href={preset()!.apiKeyURL}
					>
						Get API key →
					</a>
				</div>
			</Show>
		</>
	);
};

export default ProviderItem;
