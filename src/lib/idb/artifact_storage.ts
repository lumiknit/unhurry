import { Artifact, ArtifactData, ArtifactMeta } from '../artifact/structs';
import { uniqueID } from '../utils';
import { SimpleIDB } from './client';

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
): Promise<ArtifactMeta> => {
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
			await tx.put(meta);
		})(),
		(async () => {
			const tx = await dataTx();
			await tx.put(data);
		})(),
	]);
	return meta;
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
export const getArtifactMeta = async (
	id: string
): Promise<ArtifactMeta | undefined> => {
	const tx = await metaTx();
	return await tx.get(id);
};

export const getArtifactData = async (
	id: string
): Promise<ArtifactData | undefined> => {
	const artifact = await getArtifactMeta(id);
	if (!artifact) return;
	const tx = await dataTx();
	return await tx.get(id);
};

export const getArtifact = async (
	id: string
): Promise<Artifact | undefined> => {
	const [meta, data] = await Promise.all([
		getArtifactMeta(id),
		getArtifactData(id),
	]);
	if (!meta || !data) return;
	return { meta, data };
};

export const getArtifactBlob = async (
	id: string
): Promise<Blob | undefined> => {
	const a = await getArtifact(id);
	if (!a) return;
	return new Blob([a.data.data], { type: a.meta.mimeType });
};

/**
 * GetDataURL for an artifact.
 */
export const getArtifactDataURL = async (
	id: string
): Promise<string | undefined> => {
	const a = await getArtifact(id);
	if (!a) return;

	const blob = new Blob([a.data.data], { type: a.meta.mimeType });
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
