export type UploadedArtifact = {
	name: string;
	uri: string;
	mimeType: string;
	data: Uint8Array;
};

/**
 * Artifact Meta
 */
export interface ArtifactMeta {
	_id: string;
	uri: string;
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
 * Artifact meta - data pair
 */
export type Artifact = {
	meta: ArtifactMeta;
	data: ArtifactData;
};
