import { Component, For, Setter, Show } from 'solid-js';

import { LLMClientType, llmPresets, ModelConfig } from '../../lib/llm';

type Props = {
	model: ModelConfig;
	updateModel: Setter<ModelConfig>;
	idx: number;
	onDelete: () => void;
};

const ModelEditor: Component<Props> = (props) => {
	let nameRef: HTMLInputElement;
	let endpointRef: HTMLInputElement;
	let apiKeyRef: HTMLInputElement;
	let modelRef: HTMLInputElement;
	let clientTypeRef: HTMLInputElement;

	const preset = llmPresets.find((p) => p.name === props.model.endpoint);
	const apiKeyURL = preset?.apiKeyURL;

	const endpoints = llmPresets.map((p) => p.name);
	const handleEndpointClick = (e: string) => {
		const preset = llmPresets.find((p) => p.name === e);
		if (!preset) return;

		props.updateModel((m) => ({
			...m,
			endpoint: e,
			apiKey: '',
			model: preset.models[0],
			clientType: preset.clientType,
			name: `${preset.name}/${preset.models[0]}`,
		}));
	};

	const models = preset?.models || [];
	const handleModelClick = (model: string) => {
		props.updateModel((m) => ({
			...m,
			model,
			name: `${preset?.name}/${model}`,
		}));
	};

	const clientTypes: LLMClientType[] = ['OpenAI', 'Gemini', 'Anthropic'];
	const handleClientTypeClick = (t: LLMClientType) => {
		props.updateModel((m) => ({
			...m,
			clientType: t,
		}));
	};

	// Handle general inputs change
	const handleInputChange = (e: Event) => {
		props.updateModel((m) => ({
			...m,
			model: modelRef!.value,
			endpoint: endpointRef!.value,
			apiKey: apiKeyRef!.value,
			clientType: clientTypeRef!.value as LLMClientType,
			name: nameRef!.value,
		}));
	};

	return (
		<div class="card">
			<div class="card-content">
				<div class="field">
					<label class="label">Endpoint</label>
					<div>
						<For each={endpoints}>
							{(e) => (
								<button
									class="tag"
									onClick={() => handleEndpointClick(e)}
								>
									{e}
								</button>
							)}
						</For>
					</div>
					<div class="control">
						<input
							ref={endpointRef!}
							class="input"
							type="text"
							value={props.model.endpoint}
							onChange={handleInputChange}
						/>
					</div>
				</div>

				<div class="field">
					<label class="label">API Key</label>
					<Show when={apiKeyURL}>
						<p>
							You can find API Key at:{' '}
							<a href={apiKeyURL} target="_blank">
								{apiKeyURL}
							</a>
						</p>
					</Show>
					<div class="control">
						<input
							ref={apiKeyRef!}
							class="input"
							type="text"
							value={props.model.apiKey}
							onChange={handleInputChange}
						/>
					</div>
				</div>

				<div class="field">
					<label class="label">Model</label>
					<div>
						<For each={models}>
							{(m) => (
								<button
									class="tag"
									onClick={() => handleModelClick(m)}
								>
									{m}
								</button>
							)}
						</For>
					</div>
					<div class="control">
						<input
							ref={modelRef!}
							class="input"
							type="text"
							value={props.model.model}
							onChange={handleInputChange}
						/>
					</div>
				</div>

				<div class="field">
					<label class="label">Client Type</label>
					<div>
						<For each={clientTypes}>
							{(t) => (
								<button
									class="tag"
									onClick={() => handleClientTypeClick(t)}
								>
									{t}
								</button>
							)}
						</For>
					</div>
					<div class="control">
						<input
							ref={clientTypeRef!}
							class="input"
							type="text"
							value={props.model.clientType}
							onChange={handleInputChange}
						/>
					</div>
				</div>

				<div class="field">
					<label class="label">Display Name</label>
					<div class="control">
						<input
							ref={nameRef!}
							class="input"
							type="text"
							value={props.model.name}
							onChange={handleInputChange}
						/>
					</div>
				</div>
			</div>

			<footer class="card-footer">
				<div class="field">
					<a
						href="#"
						class="card-footer-item"
						onClick={props.onDelete}
					>
						{' '}
						Delete{' '}
					</a>
				</div>
			</footer>
		</div>
	);
};

export default ModelEditor;
