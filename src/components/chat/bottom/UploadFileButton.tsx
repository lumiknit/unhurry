import {
	BiRegularCamera,
	BiRegularFile,
	BiRegularImage,
	BiRegularPaperclip,
	BiRegularUpload,
	BiSolidBox,
} from 'solid-icons/bi';
import { Component, Show, onCleanup, onMount } from 'solid-js';
import { toast } from 'solid-toast';

import { openArtifactPickModal } from '@/components/artifact-list/ArtifactPickModal';
import { openArtifactUploadModal } from '@/components/modal/ArtifactUploadModal';
import Dropdown, { DropdownItem } from '@/components/utils/Dropdown';
import { createIsMobile } from '@/components/utils/media';
import { UploadedArtifact } from '@/lib/artifact/structs';
import { openUploadArtifactDialog } from '@/lib/artifact/upload';
import { getBEService } from '@/lib/be';
import { createArtifact, getArtifactMeta } from '@/lib/idb/artifact_storage';
import { logr } from '@/lib/logr';

interface Props {
	onFile: (name: string, id: string) => void;
}

const UploadFileButton: Component<Props> = (props) => {
	const isMobile = createIsMobile();

	const upload = async (mime: string, capture?: 'user' | 'environment') => {
		try {
			const metas = await openUploadArtifactDialog(mime, capture);
			logr.info('[UploadFileButton] File selected: ', metas);
			if (metas.length === 1) {
				toast.success('File uploaded: ' + metas[0]._id);
			} else {
				toast.success('Files uploaded: ' + metas.length + ' files');
			}
			for (const meta of metas) {
				props.onFile(meta.name, meta._id);
			}
		} catch (err) {
			logr.error('[UploadFileButton] Failed to upload file:', err);
			toast.error('Failed to upload file: ' + err);
		}
	};

	const uploadArtifact = async () => {
		const artifactID = await openArtifactPickModal();
		if (!artifactID) {
			return;
		}
		// Get artifact from IDB
		const artifactMeta = await getArtifactMeta(artifactID);
		if (!artifactMeta) {
			toast.error('Artifact not found: ' + artifactID);
			return;
		}
		const name = artifactMeta.name;
		props.onFile(name, artifactID);
	};

	const uploadByModal = async () => {
		const meta = await openArtifactUploadModal();
		if (meta) {
			props.onFile(meta.name, meta._id);
		}
	};

	// Window drag & drop event
	onMount(async () => {
		const be = await getBEService();
		const handleDnD = (artifacts: UploadedArtifact[]) => {
			artifacts.map(async (x) => {
				const meta = await createArtifact(
					x.uri,
					x.name,
					x.mimeType,
					x.data
				);
				logr.info('[UploadFileButton] File selected:', meta._id);
				toast.success('File uploaded: ' + meta._id);
				props.onFile(meta.name, meta._id);
			});
		};
		be.mountDragAndDrop(handleDnD);
	});

	onCleanup(async () => {
		const be = await getBEService();
		be.unmountDragAndDrop();
	});

	const linkss: DropdownItem[][] = [
		[
			{
				icon: BiRegularCamera,
				label: 'Camera',
				onClick: () => upload('image/*', 'environment'),
			},
			{
				icon: BiRegularImage,
				label: 'Image',
				onClick: () => upload('image/*'),
			},
			{
				icon: BiRegularFile,
				label: 'File',
				onClick: () => upload('*/*'),
			},
			{
				icon: BiRegularUpload,
				label: 'Other',
				onClick: () => uploadByModal(),
			},
		],
		[
			{
				icon: BiSolidBox,
				label: 'Artifact',
				onClick: uploadArtifact,
			},
		],
	];

	return (
		<Dropdown divClass="is-up" btnClass="tag" items={linkss}>
			<span class="icon">
				<BiRegularPaperclip />
			</span>
			<Show when={!isMobile()}>
				<span>Upload</span>
			</Show>
		</Dropdown>
	);
};

export default UploadFileButton;
