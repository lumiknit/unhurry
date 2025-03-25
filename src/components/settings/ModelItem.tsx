import {
	BiRegularLeftArrow,
	BiRegularRightArrow,
	BiRegularTrash,
} from 'solid-icons/bi';
import { Component, createEffect, createSignal, Setter } from 'solid-js';
import { toast } from 'solid-toast';

import { logr } from '@/lib/logr';

import {
	LLMClientType,
	llmPresets,
	Model,
	ModelConfig,
	newClientFromConfig,
} from '@lib/llm';

import TextForm from './form/TextForm';

interface Props {
	model: ModelConfig;
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

	let last_endpoint = '';
	createEffect(() => {
		if (props.model.endpoint !== last_endpoint) {
			last_endpoint = props.model.endpoint;
			setModels(undefined);
		}
	});

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

	const handleEndpointChange = (v: string) => {
		const preset = llmPresets.find((p) => p.name === v);
		if (preset) {
			props.updateModel((m) => ({
				...m,
				endpoint: preset.endpoint,
				apiKey: '',
				model: preset.models[0],
				clientType: preset.clientType,
				name: `${preset.name}/${preset.models[0]}`,
			}));
		} else {
			props.updateModel((m) => ({
				...m,
				endpoint: v,
			}));
		}
	};

	const handleModelChange = (id: string) => {
		props.updateModel((m) => ({
			...m,
			model: id,
			name: `${preset?.name}/${id}`,
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

	return (
		<>
			<div class="mb-4" />

			<h4 class="title is-4">
				{props.idx + 1}. {props.model.name}
			</h4>

			<div class="has-text-right mb-4">
				<button class="button is-primary mr-2" onClick={props.onMoveUp}>
					<BiRegularLeftArrow />
				</button>
				<button
					class="button is-primary mr-2"
					onClick={props.onMoveDown}
				>
					<BiRegularRightArrow />
				</button>
				<button class="button is-danger" onClick={props.onDelete}>
					<BiRegularTrash />
					Delete
				</button>
			</div>

			<TextForm
				label="Endpoint"
				desc="API Endpoint"
				options={endpoints.map((e) => ({ label: e, value: e }))}
				controlClass="flex-1 maxw-75"
				get={() => props.model.endpoint}
				set={(v) => handleEndpointChange(v)}
			/>

			<TextForm
				label="API Key"
				desc=""
				controlClass="flex-1 maxw-75"
				get={() => props.model.apiKey}
				set={(v) => props.updateModel((m) => ({ ...m, apiKey: v }))}
			/>

			<div class="mb-4">
				API Key URL:
				<a target="_blank" href={apiKeyURL}>
					{apiKeyURL}
				</a>
			</div>

			<TextForm
				label="Model"
				desc="LLM"
				controlClass="flex-1 maxw-75"
				options={
					models()?.map((m) => ({ label: m.id, value: m.id })) ||
					false
				}
				onLoadOptions={updateModelList}
				get={() => props.model.model}
				set={(v) => handleModelChange(v)}
			/>

			<TextForm
				label="Client Type"
				desc="Client"
				options={clientTypes.map((t) => ({ label: t, value: t }))}
				controlClass="flex-1 maxw-75"
				get={() => props.model.clientType}
				set={(v) => handleClientTypeClick(v as LLMClientType)}
			/>

			<TextForm
				label="Display Name"
				desc="Display"
				controlClass="flex-1 maxw-75"
				get={() => props.model.name}
				set={(v) => props.updateModel((m) => ({ ...m, name: v }))}
			/>

			<div class="field">
				<label class="label">Additional System Prompt</label>
				<div class="control">
					<textarea
						ref={systemPromptRef!}
						class="textarea"
						value={props.model.systemPrompt}
						onChange={handleInputChange}
					/>
				</div>
			</div>
		</>
	);
};

export default ModelEditor;
