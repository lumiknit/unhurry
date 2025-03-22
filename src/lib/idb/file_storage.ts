import { SimpleIDB } from './client';

/**
 * File Item.
 */
interface FileItem {
	_id: string;

	/**
	 * Created timestamp.
	 */
	createdAt: number;

	/**
	 * MIME Type for the file.
	 */
	mimeType: string;

	/**
	 * Raw data.
	 */
	data: string | Uint8Array;
}

/**
 * IDB for file storage
 */
const fileIDB = new SimpleIDB('file-i', 'files', 1);

/**
 * Transaction for file storage
 */
export const fileTx = async () => {
	return await fileIDB.transaction<FileItem>('readwrite');
};

export const genFileID = () => {
	const ts = Date.now().toString(36);
	const rand = Math.random().toString(36).slice(2);
	return ts + '_' + rand;
};

/**
 * Create a file for storage.
 */
export const createFile = async (
	mimeType: string,
	data: string | Uint8Array
): Promise<string> => {
	const id = genFileID();
	const tx = await fileTx();
	await tx.put({
		_id: id,
		createdAt: Date.now(),
		mimeType,
		data,
	});
	return id;
};

/**
 * List all files in storage.
 */
export const listFiles = async (): Promise<FileItem[]> => {
	const tx = await fileTx();
	return await tx.getAll();
};

/**
 * Get a file from storage.
 */
export const getFile = async (id: string): Promise<FileItem | undefined> => {
	const tx = await fileTx();
	return await tx.get(id);
};

/**
 * GetDataURL for a file.
 */
export const getFileDataURL = async (
	id: string
): Promise<string | undefined> => {
	const file = await getFile(id);
	if (!file) return;
	if (typeof file.data === 'string') {
		const blob = new Blob([file.data], { type: file.mimeType });
		return URL.createObjectURL(blob);
	} else {
		const blob = new Blob([file.data], { type: file.mimeType });
		return URL.createObjectURL(blob);
	}
};

/**
 * Delete a file from storage.
 */
export const deleteFile = async (id: string) => {
	const tx = await fileTx();
	await tx.delete(id);
};
