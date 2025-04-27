import { ArtifactMeta, UploadedArtifact } from '../artifact/structs';
import { getBEService, getBrowserBEService } from '../be';
import { createArtifact } from '../idb/artifact_storage';

export const uploadFiles = async (
	mime: string,
	capture?: 'user' | 'environment'
): Promise<UploadedArtifact[]> => {
	if (capture) {
		return (await getBrowserBEService()).uploadFiles(mime, capture);
	}
	return (await getBEService()).uploadFiles(mime);
};

export const openUploadArtifactDialog = async (
	mime: string,
	capture?: 'user' | 'environment'
): Promise<ArtifactMeta[]> => {
	const f = await uploadFiles(mime, capture);
	return await Promise.all(
		f.map(async (f) => {
			const artifact = await createArtifact(
				f.uri,
				f.name,
				f.mimeType,
				f.data
			);
			return artifact;
		})
	);
};
