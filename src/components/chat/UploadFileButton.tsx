import { BiRegularFile, BiRegularImage, BiRegularUpload } from 'solid-icons/bi';
import { Component, createSignal } from 'solid-js';
import toast from 'solid-toast';

import { createFile } from '@/lib/idb/file_storage';
import { logr } from '@/lib/logr';

interface Props {
	onFile: (name: string, id: string) => void;
}

const UploadFileButton: Component<Props> = (props) => {
	const [isOpen, setIsOpen] = createSignal(false);

	const toggleDropdown = () => setIsOpen(!isOpen());

	const handleFile = (mimeType: string, file: File) => {
		// Read file content as Uint8Array
		const reader = new FileReader();
		reader.onload = (e) => {
			// Data as Uint8Array
			const data: Uint8Array = new Uint8Array(
				e.target!.result as ArrayBuffer
			);

			// Upload to IDB
			createFile(file.name, mimeType, data)
				.then((id) => {
					logr.info('File uploaded:', id);
					toast.success('File uploaded: ' + id);
					props.onFile(file.name, id);
				})
				.catch((err) => {
					logr.error('Failed to upload file:', err);
					toast.error('Failed to upload file: ' + err);
				});
		};
		reader.readAsArrayBuffer(file);
	};

	const upload = (mime: string) => {
		setIsOpen(false);

		const input = document.createElement('input');
		input.type = 'file';
		input.accept = mime;
		input.onchange = (e) => {
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
	const uploadFile = () => upload('*/*');

	return (
		<div class={`dropdown ${isOpen() ? 'is-active' : ''} is-up`}>
			<div class="dropdown-trigger">
				<button
					class="button is-small"
					aria-haspopup="true"
					aria-controls="dropdown-menu"
					onClick={toggleDropdown}
				>
					<span class="icon">
						<BiRegularUpload />
					</span>
					<span>Upload</span>
				</button>
			</div>
			<div class="dropdown-menu" id="dropdown-menu" role="menu">
				<div class="dropdown-content">
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
