import { Component, For } from 'solid-js';

interface UploadedFile {
	id: string;
	name: string;
}

interface UploadedFilesProps {
	files: UploadedFile[];
	onDelete: (id: string) => void;
}

const UploadedFiles: Component<UploadedFilesProps> = (props) => {
	return (
		<div class="input-tags">
			<For each={props.files}>
				{(file) => (
					<button
						class="tag mr-1"
						onClick={() => props.onDelete(file.id)}
					>
						{file.name}
						<span class="delete is-small" />
					</button>
				)}
			</For>
		</div>
	);
};

export default UploadedFiles;
