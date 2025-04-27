import {
	BiRegularCamera,
	BiRegularFile,
	BiRegularImage,
	BiRegularPaperclip,
	BiRegularUpload,
	BiSolidBox,
} from 'solid-icons/bi';
import {
	Component,
	createSignal,
	Show,
	onCleanup,
	onMount,
	Setter,
	For,
} from 'solid-js';
import { toast } from 'solid-toast';

import { openArtifactPickModal } from '@/components/artifact-list/ArtifactPickModal';
import { openArtifactUploadModal } from '@/components/modal/ArtifactUploadModal';
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
	let rootRef: HTMLDivElement;
	const isMobile = createIsMobile();
	const [isOpen, setIsOpen_] = createSignal(false);

	const setIsOpen: Setter<boolean> = (v) => {
		const x = setIsOpen_(v);
		if (x) {
			document.addEventListener('click', handleOutsideClick);
		} else {
			document.removeEventListener('click', handleOutsideClick);
		}
	};

	const handleOutsideClick = (e: MouseEvent) => {
		if (!rootRef!.contains(e.target as Node)) {
			setIsOpen(false);
		}
	};

	onCleanup(() => {
		document.removeEventListener('click', handleOutsideClick);
	});

	const toggleDropdown = () => setIsOpen(!isOpen());

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
		setIsOpen(false);

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

	type Link = {
		icon: Component;
		label: string;
		onClick: () => void;
	};

	const linkss: Link[][] = [
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
		<div
			ref={rootRef!}
			class={`dropdown ${isOpen() ? 'is-active' : ''} is-up`}
		>
			<div class="dropdown-trigger">
				<button
					class="tag h-full"
					aria-haspopup="true"
					aria-controls="dropdown-menu"
					onClick={toggleDropdown}
				>
					<span class="icon">
						<BiRegularPaperclip />
					</span>
					<Show when={!isMobile()}>
						<span>Upload</span>
					</Show>
				</button>
			</div>
			<div class="dropdown-menu" id="dropdown-menu" role="menu">
				<div class="dropdown-content">
					<For each={linkss}>
						{(links, j) => (
							<>
								<Show when={j() > 0}>
									<hr class="my-1" />
								</Show>
								<For each={links}>
									{(link) => (
										<a
											class="dropdown-item"
											href="#"
											onClick={link.onClick}
										>
											<span class="icon">
												<link.icon />
											</span>
											<span>{link.label}</span>
										</a>
									)}
								</For>
							</>
						)}
					</For>
				</div>
			</div>
		</div>
	);
};

export default UploadFileButton;
