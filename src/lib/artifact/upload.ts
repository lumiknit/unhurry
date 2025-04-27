import { ArtifactMeta, createArtifact } from '../idb/artifact_storage';
import { logr } from '../logr';

export type UploadingFile = {
	name: string;
	type: string;
	data: Uint8Array;
};

/**
 * Open upload dialog for a file.
 *
 * @param mime The MIME type of the file to upload.
 * @param capture Optional capture attribute for the file input.
 */
export const loadFileByInput = (
	mime: string,
	capture?: 'user' | 'environment'
) =>
	new Promise<File>((resolve, reject) => {
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
				resolve(file);
			}
			input.remove();
		};
		input.onerror = (e) => {
			logr.error('Failed to upload file:', e);
			reject(new Error('Failed to upload file: ' + e));
			input.remove();
		};
		input.click();
	});

export const readFileData = (file: File): Promise<Uint8Array> =>
	new Promise((resolve, reject) => {
		// Read file content as Uint8Array
		const reader = new FileReader();
		reader.onerror = (e) => {
			logr.error('Failed to read file:', e);
			reject(new Error('Failed to read file: ' + e));
		};
		reader.onload = (e) => {
			// Data as Uint8Array
			const data: Uint8Array = new Uint8Array(
				e.target!.result as ArrayBuffer
			);
			resolve(data);
		};
		reader.readAsArrayBuffer(file);
	});

export const openUploadArtifactDialog = async (
	mime: string,
	capture?: 'user' | 'environment'
): Promise<ArtifactMeta> => {
	const file = await loadFileByInput(mime, capture);
	const data = await readFileData(file);
	return await createArtifact(file.name, mime, data);
};
