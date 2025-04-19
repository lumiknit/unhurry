import { uniqueID } from '../utils';
import { SimpleIDB } from './client';

/**
 * Artifact Meta
 */
export interface ArtifactMeta {
	_id: string;
	name: string;
	createdAt: number;
	mimeType: string;
}

/**
 * Artifact Data
 */
export interface ArtifactData {
	_id: string;
	data: string | Uint8Array;
}

/**
 * IDB for artifact storage
 */
const artifactIDB = new SimpleIDB('artf-i', ['meta', 'data'], 2);

const metaTx = async () => {
	return await artifactIDB.transaction<ArtifactMeta>(
		'readwrite',
		undefined,
		'meta'
	);
};

const dataTx = async () => {
	return await artifactIDB.transaction<ArtifactData>(
		'readwrite',
		undefined,
		'data'
	);
};

/**
 * Create an artifact for storage.
 */
export const createArtifact = async (
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
 * List all artifacts in storage.
 */
export const listArtifacts = async (): Promise<ArtifactMeta[]> => {
	const tx = await metaTx();
	return await tx.getAll();
};

/**
 * Get an artifact from storage.
 */
export const getArtifact = async (
	id: string
): Promise<ArtifactMeta | undefined> => {
	const tx = await metaTx();
	return await tx.get(id);
};

export const getArtifactBlob = async (
	id: string
): Promise<Blob | undefined> => {
	const artifact = await getArtifact(id);
	if (!artifact) return;
	const tx = await dataTx();
	const data = await tx.get(id);
	if (!data) return;
	return new Blob([data.data], { type: artifact.mimeType });
};

/**
 * GetDataURL for an artifact.
 */
export const getArtifactDataURL = async (
	id: string
): Promise<string | undefined> => {
	const artifact = await getArtifact(id);
	if (!artifact) return;
	const tx = await dataTx();
	const data = await tx.get(id);
	if (!data) return;

	const blob = new Blob([data.data], { type: artifact.mimeType });
	return await new Promise((resolve, reject) => {
		const fileReader = new FileReader();
		fileReader.onload = (e) => {
			resolve(e.target?.result as string);
		};
		fileReader.onerror = reject;
		fileReader.readAsDataURL(blob);
	});
};

export const updateArtifactMeta = async (
	id: string,
	artifactMeta: Partial<ArtifactMeta>
): Promise<void> => {
	const tx = await metaTx();
	const artifact = await tx.get(id);
	if (!artifact) return;
	const updatedArtifact = {
		...artifact,
		...artifactMeta,
		_id: id,
	};
	await tx.put(updatedArtifact);
};

/**
 * Delete an artifact from storage.
 */
export const deleteArtifact = async (id: string) => {
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

export const deleteAllArtifacts = async () => {
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
