import {
	BiRegularLeftArrow,
	BiRegularRightArrow,
	BiRegularTrash,
} from 'solid-icons/bi';
import { Component, createEffect, createSignal, Setter } from 'solid-js';
import { toast } from 'solid-toast';

import { getBEService } from '@lib/be';
import {
	getWellKnownModelOpts,
	LLMClientType,
	llmPresets,
	Model,
	ModelConfig,
	newClientFromConfig,
	ToolCallStyle,
} from '@lib/llm';
import { logr } from '@lib/logr';

import CodeForm from './form/CodeForm';
import TextForm from './form/TextForm';
import { openQRModal } from '../modal/QRModal';
import NumForm from './form/NumForm';
import SelectForm from './form/SelectForm';
import { getAIIconComponent } from '../utils/icons/AIIcons';

interface Props {
	model: ModelConfig;
	updateModel: Setter<ModelConfig>;
	idx: number;
	onMoveUp: () => void;
	onMoveDown: () => void;
	onDelete: () => void;
}

const ModelEditor: Component<Props> = (props) => {
	let systemPromptRef: HTMLTextAreaElement | null;

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

	let preset = llmPresets.find((p) => p.endpoint === props.model.endpoint);
	const [apiKeyURL, setApiKeyURL] = createSignal<string | undefined>(
		preset?.apiKeyURL
	);

	const handleEndpointChange = (url: string) => {
		const preset = llmPresets.find((p) => p.endpoint === url);
		if (preset !== undefined) {
			props.updateModel((m) => ({
				...m,
				endpoint: preset.endpoint,
				apiKey: '',
				model: preset.models[0],
				clientType: preset.clientType,
				name: `${preset.name}/${preset.models[0]}`,
			}));
			setApiKeyURL(preset.apiKeyURL);
		} else {
			props.updateModel((m) => ({
				...m,
				endpoint: url,
			}));
		}
	};

	const handleModelChange = (id: string) => {
		preset = llmPresets.find((p) => p.endpoint === props.model.endpoint);
		const name = preset ? `${preset.name}/${id}` : id;
		const opts = getWellKnownModelOpts(id) ?? {};
		props.updateModel((m) => ({
			...m,
			...opts,
			model: id,
			name: name,
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
			systemPrompt: systemPromptRef!.value,
		}));
	};

	/**
	 * Show QR code modal, to connect to local model
	 */
	const showLocalModelQR = async () => {
		const be = await getBEService();
		// Replace localhost from the endpoint
		const model = {
			...props.model,
		};
		try {
			const ip = '://' + (await be.myIP());
			model.endpoint = model.endpoint
				.replace('://127.0.0.1', ip)
				.replace('://localhost', ip);
		} catch {
			toast.error('Local IP is unavailable');
		}
		const v = JSON.stringify(model);
		openQRModal(v);
	};

	/**
	 * Load model config from the QR code
	 */
	const loadFromQR = async () => {
		const be = await getBEService();
		let v: ModelConfig;
		try {
			const s = await be.scanQRCode();
			v = JSON.parse(s);
		} catch (e) {
			logr.error(`Failed to scan QR code: ${e}`);
			toast.error('Failed to load QR code');
			return;
		}
		props.updateModel((m) => ({
			...m,
			endpoint: v.endpoint,
			apiKey: v.apiKey,
			model: v.model,
			clientType: v.clientType,
			name: v.name,
			systemPrompt: v.systemPrompt,
			useToolCall: v.toolCallStyle,
		}));
	};

	return (
		<>
			<div class="mb-4" />

			<h4 class="title is-4">
				{props.idx + 1}. {props.model.name}
			</h4>

			<div class="has-text-right mb-4">
				<button class="button is-small mr-1" onClick={loadFromQR}>
					Load QR
				</button>

				<button class="button is-small mr-1" onClick={showLocalModelQR}>
					Show QR
				</button>

				<button
					class="button is-small is-primary mr-1"
					onClick={props.onMoveUp}
				>
					<BiRegularLeftArrow />
					&nbsp;
				</button>
				<button
					class="button is-small is-primary mr-1"
					onClick={props.onMoveDown}
				>
					<BiRegularRightArrow />
					&nbsp;
				</button>
				<button
					class="button is-small is-danger"
					onClick={props.onDelete}
				>
					<BiRegularTrash />
					Delete
				</button>
			</div>

			<CodeForm label="ID" value={props.model.id} />

			<TextForm
				label="Endpoint"
				desc="API Endpoint"
				options={llmPresets.map((p) => ({
					label: p.name,
					value: p.endpoint,
					icon: getAIIconComponent(p.name),
				}))}
				controlClass="flex-1 maxw-75"
				get={() => props.model.endpoint}
				set={(url) => handleEndpointChange(url)}
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
				<a target="_blank" href={apiKeyURL()}>
					{apiKeyURL()}
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
				options={clientTypes.map((t) => ({
					label: t,
					value: t,
					icon: getAIIconComponent(t),
				}))}
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

			<SelectForm
				label="Use ToolCall"
				desc="If model supports ToolCall, enable this"
				options={[
					{
						label: 'Built-In',
						value: 'builtin',
					},
					{
						label: 'Gemma',
						value: 'gemma',
					},
				]}
				get={() => props.model.toolCallStyle || 'builtin'}
				set={(v) =>
					props.updateModel((m) => ({
						...m,
						toolCallStyle: v as ToolCallStyle,
					}))
				}
			/>

			<NumForm
				label="Context Size"
				desc="Model's max context size (in tokens)"
				get={() => props.model.contextLength || 0}
				set={(v) => {
					props.updateModel((m) => ({
						...m,
						contextLength: v,
					}));
				}}
			/>

			<NumForm
				label="Max Output"
				desc="Model's max output (in tokens)"
				get={() => props.model.maxOutputTokens || 0}
				set={(v) => {
					props.updateModel((m) => ({
						...m,
						maxOutputTokens: v,
					}));
				}}
			/>

			<TextForm
				label="Think Start"
				desc="Word to start thinking (reasoning)"
				controlClass="flex-1 maxw-75"
				get={() => props.model.thinkOpen || ''}
				set={(v) => props.updateModel((m) => ({ ...m, thinkOpen: v }))}
			/>

			<TextForm
				label="Think End"
				desc="Word to start thinking (reasoning)"
				controlClass="flex-1 maxw-75"
				get={() => props.model.thinkClose || ''}
				set={(v) => props.updateModel((m) => ({ ...m, thinkClose: v }))}
			/>
		</>
	);
};

export default ModelEditor;
