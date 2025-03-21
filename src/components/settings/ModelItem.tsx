import {
	Component,
	createSignal,
	For,
	Match,
	Setter,
	Show,
	Switch,
} from 'solid-js';
import { toast } from 'solid-toast';

import { logr } from '@/lib/logr';

import {
	LLMClientType,
	llmPresets,
	Model,
	ModelConfig,
	newClientFromConfig,
} from '@lib/llm';

interface Props {
	model: ModelConfig;
	editing: boolean;
	setEditing: (v: boolean) => void;
	updateModel: Setter<ModelConfig>;
	idx: number;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onDelete: () => void;
}

const ModelEditor: Component<Props> = (props) => {
	let nameRef: HTMLInputElement;
	let endpointRef: HTMLInputElement;
	let apiKeyRef: HTMLInputElement;
	let modelRef: HTMLInputElement;
	let clientTypeRef: HTMLInputElement;
	let systemPromptRef: HTMLTextAreaElement;

	const [models, setModels] = createSignal<Model[] | undefined>();
	const [showAllModels, setShowAllModels] = createSignal(false);

	const updateModelList = async () => {
		const task = async () => {
			// Create a new client
			const cli = newClientFromConfig(props.model);
			// Fetch the list of models
			const ms = await cli.listModels();
			setModels(ms);
		};
		await toast.promise(
			task(),
			{
				loading: `Loading models of ${props.model.endpoint}...`,
				success: `Models of ${props.model.endpoint} loaded`,
				error: (e) => {
					logr.error(e);
					return 'Failed to load models';
				},
			},
			{
				duration: 1000,
			}
		);
	};

	const preset = llmPresets.find((p) => p.endpoint === props.model.endpoint);
	const apiKeyURL = preset?.apiKeyURL;

	const endpoints = llmPresets.map((p) => p.name);
	const handleEndpointClick = (e: string) => {
		const preset = llmPresets.find((p) => p.name === e);
		if (!preset) return;

		props.updateModel((m) => ({
			...m,
			endpoint: preset.endpoint,
			apiKey: '',
			model: preset.models[0],
			clientType: preset.clientType,
			name: `${preset.name}/${preset.models[0]}`,
		}));
	};

	const handleModelClick = (model: Model) => {
		props.updateModel((m) => ({
			...m,
			model: model.id,
			name: `${preset?.name}/${model.id}`,
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
	const handleInputChange = () => {
		props.updateModel((m) => ({
			...m,
			model: modelRef!.value,
			endpoint: endpointRef!.value,
			apiKey: apiKeyRef!.value.trim(),
			clientType: clientTypeRef!.value as LLMClientType,
			name: nameRef!.value,
			systemPrompt: systemPromptRef!.value,
		}));
	};

	const loadModels = () => {
		// If models is not loaded (undefined), fetch
		if (!models()) {
			updateModelList();
		} else {
			// If models is loaded, show all
			setShowAllModels(true);
		}
	};

	return (
		<div class="card">
			<div class="card-content">
				<Switch>
					<Match when={props.editing}>
						<div class="field">
							<label class="label">Endpoint</label>
							<div class="mb-1">
								<For each={endpoints}>
									{(e) => (
										<button
											class="tag mr-1"
											onClick={() =>
												handleEndpointClick(e)
											}
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
							<div class="mb-1">
								<For
									each={(models() || []).slice(
										0,
										showAllModels() ? undefined : 5
									)}
								>
									{(m) => (
										<button
											class="tag mr-1"
											onClick={() => handleModelClick(m)}
										>
											{m.id}
										</button>
									)}
								</For>
								<Show
									when={
										!models() ||
										(!showAllModels() &&
											models()!.length > 5)
									}
								>
									<button class="tag" onClick={loadModels}>
										...
									</button>
								</Show>
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
							<div class="mb-1">
								<For each={clientTypes}>
									{(t) => (
										<button
											class="tag mr-1"
											onClick={() =>
												handleClientTypeClick(t)
											}
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

						<div class="field">
							<label class="label">
								Additional System Prompt
							</label>
							<div class="control">
								<textarea
									ref={systemPromptRef!}
									class="textarea"
									value={props.model.systemPrompt}
									onChange={handleInputChange}
								/>
							</div>
						</div>
					</Match>
					<Match when>
						<div>
							<p class="title is-4">
								{props.idx + 1}. {props.model.name}
							</p>
							<ul>
								<li class="text-ellipsis">
									{props.model.endpoint}
								</li>
								<li class="text-ellipsis">
									{props.model.model}
								</li>
							</ul>
							<div class="has-text-right">
								<button
									class="button is-small"
									onClick={() => props.setEditing(true)}
								>
									Edit
								</button>
							</div>
						</div>
					</Match>
				</Switch>
			</div>

			<footer class="card-footer">
				<a href="#" class="card-footer-item" onClick={props.onMoveUp}>
					Up
				</a>
				<a href="#" class="card-footer-item" onClick={props.onMoveDown}>
					Down
				</a>
				<a
					href="#"
					class="card-footer-item has-text-danger"
					onClick={props.onDelete}
				>
					Delete
				</a>
			</footer>
		</div>
	);
};

export default ModelEditor;
