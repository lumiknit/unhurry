import { createSignal, onMount, Show } from 'solid-js';
import { toast } from 'solid-toast';

import Buttons from '@/components/utils/Buttons';
import { ArtifactMeta, UploadedArtifact } from '@/lib/artifact/structs';
import { uploadFiles } from '@/lib/artifact/upload';
import { getBEService } from '@/lib/be';
import { createArtifact } from '@/lib/idb/artifact_storage';

import { openModal } from './ModalContainer';

type Options = {
	initURL?: string;
};

/**
 * Open a modal for uploading artifacts, either from a file or a URL.
 */
export const openArtifactUploadModal = async (options: Options = {}) =>
	await openModal<ArtifactMeta>((props) => {
		let urlRef: HTMLInputElement;
		let nameRef: HTMLInputElement;

		const [a, setA] = createSignal<UploadedArtifact | null>(null);

		const uploadLocalFileInner = async (
			mime: string,
			capture?: 'user' | 'environment'
		) => {
			const f = await uploadFiles(mime, capture);
			if (f.length > 0) {
				setA(f[0]);
			}
		};

		const uploadLocalFile = async (
			mime: string,
			capture?: 'user' | 'environment'
		) => {
			toast.promise(uploadLocalFileInner(mime, capture), {
				loading: 'Loading file...',
				success: 'File loaded successfully',
				error: (err) => 'Failed to load file: ' + err,
			});
		};

		const uploadRemoteFileInner = async () => {
			// Fetch the file from the URL
			const be = await getBEService();
			const resp = await be.fetch(urlRef!.value);
			if (!resp.ok) {
				throw new Error(
					'Failed to fetch file from URL: ' + resp.statusText
				);
			}
			resp.headers.forEach((v, k) => {
				console.log('Header', k, v);
			});
			const name = urlRef!.value.split('/').pop() || 'file';
			const bytes = await resp.arrayBuffer();
			setA({
				uri: urlRef!.value,
				name,
				mimeType: (resp.headers.get('Content-Type') || 'text/plain')
					.split(';')[0]
					.trim(),
				data: new Uint8Array(bytes),
			});
		};

		const uploadRemoteFile = async () => {
			toast.promise(uploadRemoteFileInner(), {
				loading: 'Loading file...',
				success: 'File loaded successfully',
				error: (err) => 'Failed to load file: ' + err,
			});
		};

		const uploadArtifact = async () => {
			const v = a();
			if (!v) return;

			const meta = await createArtifact(
				v.uri,
				v.name,
				v.mimeType,
				v.data
			);
			toast.success('File uploaded: ' + meta._id);
			props.onClose(meta);
		};

		onMount(() => {
			if (options.initURL) {
				urlRef!.value = options.initURL;
				uploadRemoteFile();
			}
		});

		return (
			<div class="box">
				<h4 class="title is-4"> Upload from Remote</h4>
				<div class="field">
					<label class="label">URL</label>
					<div class="control">
						<input
							ref={urlRef!}
							type="text"
							class="input"
							placeholder="https://"
						/>
					</div>
				</div>
				<div>
					<button
						class="button is-primary"
						onClick={uploadRemoteFile}
					>
						Download from URL
					</button>
				</div>

				<h4 class="title is-4"> Upload from Local</h4>
				<div>
					<Buttons
						buttons={[
							{
								class: 'button is-primary',
								label: 'Camera',
								onClick: () =>
									uploadLocalFile('image/*', 'environment'),
							},
							{
								class: 'button is-primary',
								label: 'Image',
								onClick: () => uploadLocalFile('image/*'),
							},
							{
								class: 'button is-primary',
								label: 'File',
								onClick: () => uploadLocalFile('*/*'),
							},
						]}
					/>
				</div>

				<Show when={a()}>
					<h4 class="title is-4"> File Info </h4>

					<ul>
						<li>
							<b>Type</b>: {a()!.mimeType}
						</li>
						<li>
							<b>Size</b>: {a()!.data.length} bytes
						</li>
					</ul>

					<div class="field">
						<label class="label">Name</label>
						<div class="control">
							<input
								ref={nameRef!}
								type="text"
								class="input"
								value={a()!.name}
								placeholder="a.txt"
							/>
						</div>
					</div>

					<div class="buttons is-right">
						<Buttons
							autofocus
							onEscape={props.onClose}
							buttons={[
								{
									class: 'button is-primary',
									label: 'Upload',
									onClick: uploadArtifact,
								},
								{
									class: 'button',
									label: 'Cancel',
									onClick: () => props.onClose(),
								},
							]}
						/>
					</div>
				</Show>
			</div>
		);
	});
