import { Component, For } from 'solid-js';

import { openArtifactPreviewModal } from '@/components/artifact-list/ArtifactPreviewModal';
import { getArtifact } from '@/lib/idb/artifact_storage';

interface UploadedFile {
	id: string;
	name: string;
}

interface UploadedFilesProps {
	files: UploadedFile[];
	onDelete: (id: string) => void;
}

const UploadedFiles: Component<UploadedFilesProps> = (props) => {
	const handleClick = (id: string) => async (e: MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		const meta = await getArtifact(id);
		if (meta) {
			const v = await openArtifactPreviewModal(meta);
			if (v) {
				props.onDelete(id);
			}
		}
	};

	const handleDeleteClick = (id: string) => (e: MouseEvent) => {
		e.stopPropagation();
		e.preventDefault();
		props.onDelete(id);
	};

	return (
		<div class="input-tags">
			<For each={props.files}>
				{(file) => (
					<button class="tag mr-1" onClick={handleClick(file.id)}>
						{file.name}
						<span
							class="delete is-small"
							onClick={handleDeleteClick(file.id)}
						/>
					</button>
				)}
			</For>
		</div>
	);
};

export default UploadedFiles;
