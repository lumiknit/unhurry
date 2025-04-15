import {
	BiRegularCamera,
	BiRegularFile,
	BiRegularImage,
	BiRegularPaperclip,
} from 'solid-icons/bi';
import { Component, createSignal, Show, onCleanup, onMount } from 'solid-js';
import { toast } from 'solid-toast';

import { createIsMobile } from '@/components/utils/media';
import { getBEService } from '@/lib/be';
import { createArtifact } from '@/lib/idb/artifact_storage';
import { logr } from '@/lib/logr';

interface Props {
	onFile: (name: string, id: string) => void;
}

const UploadFileButton: Component<Props> = (props) => {
	const isMobile = createIsMobile();
	const [isOpen, setIsOpen] = createSignal(false);

	const toggleDropdown = () => setIsOpen(!isOpen());

	const makeArtifact = async (
		name: string,
		mimeType: string,
		data: Uint8Array
	) => {
		try {
			const id = await createArtifact(name, mimeType, data);
			logr.info('File uploaded:', id);
			toast.success('File uploaded: ' + id);
			props.onFile(name, id);
		} catch (err) {
			logr.error('Failed to upload file:', err);
			toast.error('Failed to upload file: ' + err);
		}
	};

	const handleFile = (mimeType: string, file: File) => {
		// Read file content as Uint8Array
		const reader = new FileReader();
		reader.onload = (e) => {
			// Data as Uint8Array
			const data: Uint8Array = new Uint8Array(
				e.target!.result as ArrayBuffer
			);

			// Upload to IDB
			makeArtifact(file.name, mimeType, data);
		};
		reader.readAsArrayBuffer(file);
	};

	const upload = (mime: string, capture?: 'user' | 'environment') => {
		setIsOpen(false);

		const input = document.createElement('input');
		input.type = 'file';
		input.accept = mime;
		if (capture) {
			input.setAttribute('capture', capture);
		}
		input.onchange = (e) => {
			console.log('File selected:', e);
			const files = (e.target as HTMLInputElement).files;
			if (files && files.length > 0) {
				const file = files[0];
				logr.info('Uploading file:', file);
				const mimeType = file.type;
				handleFile(mimeType, file);
			}
			input.remove();
		};
		input.click();
	};

	const uploadImage = () => upload('image/*');
	const uploadCamera = () => upload('image/*', 'environment');
	const uploadFile = () => upload('*/*');

	// Window drag & drop event
	onMount(async () => {
		console.log('Mounted');
		const be = await getBEService();
		be.mountDragAndDrop((artifacts) => {
			artifacts.map((x) => makeArtifact(x.name, x.mimeType, x.data));
		});
	});

	onCleanup(async () => {
		const be = await getBEService();
		be.unmountDragAndDrop();
	});

	return (
		<div class={`dropdown ${isOpen() ? 'is-active' : ''} is-up`}>
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
					<a class="dropdown-item" href="#" onClick={uploadCamera}>
						<BiRegularCamera />
						Camera
					</a>
					<a class="dropdown-item" href="#" onClick={uploadImage}>
						<BiRegularImage />
						Image
					</a>
					<a class="dropdown-item" href="#" onClick={uploadFile}>
						<BiRegularFile />
						File
					</a>
				</div>
			</div>
		</div>
	);
};

export default UploadFileButton;
