import { uniqueID } from '../utils';
import { SimpleIDB } from './client';

/**
 * File Meta
 */
export interface FileMeta {
	_id: string;
	name: string;
	createdAt: number;
	mimeType: string;
}

/**
 * File Data
 */
export interface FileData {
	_id: string;
	data: string | Uint8Array;
}

/**
 * IDB for file storage
 */
const fileIDB = new SimpleIDB('file-i', ['meta', 'data'], 2);

const metaTx = async () => {
	return await fileIDB.transaction<FileMeta>('readwrite', undefined, 'meta');
};

const dataTx = async () => {
	return await fileIDB.transaction<FileData>('readwrite', undefined, 'data');
};

/**
 * Create a file for storage.
 */
export const createFile = async (
	name: string,
	mimeType: string,
	fileData: string | Uint8Array
): Promise<string> => {
	const id = uniqueID();
	const meta = {
		_id: id,
		name,
		createdAt: Date.now(),
		mimeType,
	};
	const data = {
		_id: id,
		data: fileData,
	};
	await Promise.all([
		(async () => {
			const tx = await metaTx();
			console.log('putting meta', meta);
			await tx.put(meta);
			console.log('put meta done');
		})(),
		(async () => {
			const tx = await dataTx();
			console.log('putting data', data);
			await tx.put(data);
			console.log('put data done');
		})(),
	]);
	return id;
};

/**
 * List all files in storage.
 */
export const listFiles = async (): Promise<FileMeta[]> => {
	const tx = await metaTx();
	return await tx.getAll();
};

/**
 * Get a file from storage.
 */
export const getFile = async (id: string): Promise<FileMeta | undefined> => {
	const tx = await metaTx();
	return await tx.get(id);
};

export const getFileBlob = async (id: string): Promise<Blob | undefined> => {
	const file = await getFile(id);
	if (!file) return;
	const tx = await dataTx();
	const data = await tx.get(id);
	if (!data) return;
	return new Blob([data.data], { type: file.mimeType });
};

/**
 * GetDataURL for a file.
 */
export const getFileDataURL = async (
	id: string
): Promise<string | undefined> => {
	const file = await getFile(id);
	if (!file) return;
	const tx = await dataTx();
	const data = await tx.get(id);
	if (!data) return;

	const blob = new Blob([data.data], { type: file.mimeType });
	return await new Promise((resolve, reject) => {
		const fileReader = new FileReader();
		fileReader.onload = (e) => {
			resolve(e.target?.result as string);
		};
		fileReader.onerror = reject;
		fileReader.readAsDataURL(blob);
	});
};

/**
 * Delete a file from storage.
 */
export const deleteFile = async (id: string) => {
	await Promise.all([
		(async () => {
			const tx = await metaTx();
			await tx.delete(id);
		})(),
		(async () => {
			const tx = await dataTx();
			await tx.delete(id);
		})(),
	]);
};

export const deleteAllFiles = async () => {
	await Promise.all([
		(async () => {
			const tx = await metaTx();
			await tx.clear();
		})(),
		(async () => {
			const tx = await dataTx();
			await tx.clear();
		})(),
	]);
};
