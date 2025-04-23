import {
	BiRegularDownload,
	BiRegularEdit,
	BiRegularTrash,
} from 'solid-icons/bi';
import {
	Component,
	createSignal,
	onMount,
	onCleanup,
	Switch,
	Match,
} from 'solid-js';
import { toast } from 'solid-toast';

import { openModal } from '@/components/modal/ModalContainer';
import { getMimeTypeFromFileName } from '@/lib/artifact/mime';
import { getBEService } from '@/lib/be';
import {
	ArtifactMeta,
	deleteArtifact,
	getArtifactBlob,
	updateArtifactMeta,
} from '@/lib/idb/artifact_storage';

import { openConfirm } from '../modal';

type RenameResult = {
	name: string;
	mimeType: string;
};

const openRenameModal = (
	artifact: ArtifactMeta
): Promise<RenameResult | undefined> => {
	type Props = {
		onClose: (newName?: RenameResult) => void;
	};
	const component: Component<Props> = (props) => {
		let nameRef: HTMLInputElement | undefined;
		let mimeRef: HTMLInputElement | undefined;

		const handleChangeName = () => {
			const mime = getMimeTypeFromFileName(nameRef!.value);
			if (mime) {
				mimeRef!.value = mime;
			}
		};

		const handleSave = () => {
			props.onClose({
				name: nameRef!.value,
				mimeType: mimeRef!.value,
			});
		};

		const handleCancel = () => {
			props.onClose();
		};

		return (
			<div class="box">
				<h4 class="title is-4">Rename Artifact</h4>
				<p>
					<strong>ID:</strong> {artifact._id}
				</p>
				<p>
					<strong>Name:</strong> {artifact.name}
				</p>
				<p>
					<strong>MIME:</strong> {artifact.mimeType}
				</p>

				<hr />

				<div class="field">
					<label class="label">New Name</label>
					<div class="control">
						<input
							ref={nameRef}
							class="input"
							type="text"
							value={artifact.name}
							onChange={handleChangeName}
						/>
					</div>
				</div>

				<div class="field">
					<label class="label">MIME</label>
					<div class="control">
						<input
							ref={mimeRef}
							class="input"
							type="text"
							value={artifact.mimeType}
						/>
					</div>
				</div>

				<div class="buttons">
					<button class="button is-success" onClick={handleSave}>
						Save
					</button>
					<button class="button" onClick={handleCancel}>
						Cancel
					</button>
				</div>
			</div>
		);
	};

	return openModal(component);
};

/**
 * Open preview of modal.
 * If the meta is changed, return true.
 */
export const openArtifactPreviewModal = (
	artifact: ArtifactMeta
): Promise<boolean | undefined> => {
	type Props = {
		onClose: (v: boolean) => void;
	};
	const component: Component<Props> = (props) => {
		const [imgURL, setImgURL] = createSignal<string | null>(null);
		const [text, setText] = createSignal<string | null>(null);

		let cleanUp = () => {};

		onMount(async () => {
			const blob = await getArtifactBlob(artifact._id);
			if (blob) {
				if (artifact.mimeType.startsWith('image/')) {
					const url = URL.createObjectURL(blob);
					setImgURL(url);
					cleanUp = () => {
						URL.revokeObjectURL(url);
					};
				} else if (blob.size > 32 * 1024) {
					// File is too large, show error
					setText('(File is too large to preview)');
				} else {
					// Try to decode as UTF-8
					const reader = new FileReader();
					reader.onload = (e) => {
						const textContent = e.target!.result as string;
						setText(textContent);
					};
					reader.onerror = (e) => {
						console.error('Error reading file:', e);
						setText(
							'(Error reading file: ' + e.target!.error + ')'
						);
					};
					reader.readAsText(blob, 'utf-8');
				}
			}
		});

		onCleanup(() => {
			cleanUp();
		});

		const handleRename = async () => {
			const result = await openRenameModal(artifact);
			if (result) {
				await toast.promise(
					updateArtifactMeta(artifact._id, {
						name: result.name,
						mimeType: result.mimeType,
					}),
					{
						loading: 'Renaming...',
						success: 'Renamed',
						error: 'Failed to rename',
					}
				);
				props.onClose(true);
			}
		};

		const handleDelete = async () => {
			const c = await openConfirm(
				'Are you sure you want to delete this artifact?'
			);
			if (c) {
				await toast.promise(deleteArtifact(artifact._id), {
					loading: 'Deleting...',
					success: 'Deleted',
					error: 'Failed to delete',
				});
				props.onClose(true);
			}
		};

		const handleDownload = async () => {
			const be = await getBEService();
			const blob = await getArtifactBlob(artifact._id);
			if (blob) {
				be.downloadFile(artifact.name, blob);
			}
		};

		return (
			<div class="box">
				<h4 class="title is-4">{artifact.name}</h4>
				<p>
					<strong>ID:</strong> {artifact._id}
				</p>

				{/* Preview */}
				<div class="preview">
					<Switch>
						<Match when={imgURL()}>
							<img src={imgURL()!} alt="Artifact Preview" />
						</Match>
						<Match when={text()}>
							<textarea
								class="textarea"
								readOnly
								value={text()!}
								rows="8"
							></textarea>
						</Match>
					</Switch>
				</div>

				<div class="buttons mt-2">
					<button
						class="button is-info is-small"
						onClick={handleDownload}
					>
						<span class="icon">
							<BiRegularDownload />
						</span>
						<span>Download</span>
					</button>

					<button
						class="button is-info is-small"
						onClick={handleRename}
					>
						<span class="icon">
							<BiRegularEdit />
						</span>
						<span>Rename</span>
					</button>

					<button
						class="button is-danger is-small"
						onClick={handleDelete}
					>
						<span class="icon">
							<BiRegularTrash />
						</span>
						<span>Delete</span>
					</button>
				</div>
			</div>
		);
	};

	return openModal(component);
};
