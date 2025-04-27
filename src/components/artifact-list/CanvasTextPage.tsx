import { useParams } from '@solidjs/router';
import { BiSolidSave } from 'solid-icons/bi';
import { Component, createSignal, onMount, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { getMimeTypeFromFileName } from '@/lib/artifact/mime';
import { ArtifactMeta } from '@/lib/artifact/structs';
import { getArtifact, createArtifact } from '@/lib/idb/artifact_storage';
import { logr } from '@/lib/logr';
import { goto } from '@/store';

const CanvasTextPage: Component = () => {
	const params = useParams();
	const id = () => params.artifactID as string;

	let uriRef: HTMLInputElement;
	let nameRef: HTMLInputElement;
	let mimeRef: HTMLInputElement;
	let dataRef: HTMLTextAreaElement;

	const [meta, setMeta] = createSignal<ArtifactMeta | undefined>();
	const [data, setData] = createSignal<string | undefined>();

	onMount(async () => {
		if (id() === '_') {
			// Create a new artifact
			setMeta({
				_id: '_',
				uri: '',
				name: '',
				mimeType: 'text/plain',
				createdAt: Date.now(),
			});
			setData('');
			return;
		}
		const a = await getArtifact(id());

		if (!a) {
			toast.error('Artifact not found');
			return;
		}

		setMeta(a.meta);

		const arr = a.data.data;
		if (typeof arr === 'string') {
			setData(arr);
		} else {
			setData(new TextDecoder().decode(arr));
		}
	});

	const handleTAKeyDown = (e: KeyboardEvent) => {
		switch (e.key) {
			case 'Tab':
				{
					e.preventDefault();
					const prev = dataRef!.value.slice(
						0,
						dataRef!.selectionStart
					);
					const next = dataRef!.value.slice(dataRef!.selectionEnd);
					dataRef!.value = prev + '\t' + next;
					dataRef!.selectionStart = dataRef!.selectionEnd =
						prev.length + 1;
				}
				break;
		}
	};

	const handleNameChange = () => {
		const v = nameRef!.value;
		const mime = getMimeTypeFromFileName(v);
		mimeRef!.value = mime;
	};

	const handleSaveAs = async () => {
		if (!nameRef!.value) {
			toast.error('Please enter a name');
		}
		if (!mimeRef!.value || mimeRef!.value.split('/').length !== 2) {
			toast.error('Invalid MIME type');
		}
		const id = await toast.promise(
			createArtifact(
				uriRef!.value,
				nameRef!.value,
				mimeRef!.value,
				dataRef!.value
			),
			{
				loading: 'Saving...',
				success: 'Saved!',
				error: (e) => {
					logr.error(`[Canvas/Text] Failed to create artifact, ${e}`);
					return 'Failed to save';
				},
			}
		);

		goto('/artifacts?q=' + id);
	};

	return (
		<div class="container">
			<h1 class="title">Artifact {id()}</h1>

			<Show when={meta()}>
				<div class="mb-2">
					<b>Created At</b>:{' '}
					{new Date(meta()?.createdAt || 0).toLocaleString()}
				</div>

				<label class="is-flex flex-split gap-2 is-align-items-center my-1">
					<div class="label mb-0">URI</div>
					<div class="control w-full">
						<input
							ref={uriRef!}
							class="input"
							type="text"
							value={meta()?.uri}
							onChange={handleNameChange}
						/>
					</div>
				</label>

				<label class="is-flex flex-split gap-2 is-align-items-center my-1">
					<div class="label mb-0">Name</div>
					<div class="control w-full">
						<input
							ref={nameRef!}
							class="input"
							type="text"
							value={meta()?.name}
							onChange={handleNameChange}
						/>
					</div>
				</label>

				<label class="is-flex flex-split gap-2 is-align-items-center my-1">
					<div class="label mb-0">MIME</div>
					<div class="control w-full">
						<input
							ref={mimeRef!}
							class="input"
							type="text"
							value={meta()?.mimeType}
						/>
					</div>
				</label>
			</Show>

			<Show when={data() !== undefined}>
				<div class="my-1">
					<button class="button is-primary" onClick={handleSaveAs}>
						<span class="icon">
							<BiSolidSave />
						</span>
						<span>Save as</span>
					</button>
				</div>
				<textarea
					ref={dataRef!}
					class="textarea is-family-monospace"
					value={data()!}
					rows={20}
					onKeyDown={handleTAKeyDown}
				/>
			</Show>
		</div>
	);
};

export default CanvasTextPage;
