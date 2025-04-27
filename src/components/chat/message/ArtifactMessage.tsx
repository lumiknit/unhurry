import { Component, createSignal, onMount, Show } from 'solid-js';

import ArtifactPreview from '@/components/artifact-list/ArtifactPreview';
import { openArtifactPreviewModal } from '@/components/artifact-list/ArtifactPreviewModal';
import { ArtifactMeta } from '@/lib/artifact/structs';
import { getArtifactMeta } from '@/lib/idb/artifact_storage';

import { ItemProps } from './message_types';

const FileMessage: Component<ItemProps> = (props) => {
	const [meta, setMeta] = createSignal<ArtifactMeta | null | undefined>();

	onMount(async () => {
		const meta = await getArtifactMeta(props.content);
		if (!meta) {
			setMeta(null);
			return;
		}
		setMeta(meta);
	});

	const openPreview = () => {
		const m = meta();
		if (!m) return;
		openArtifactPreviewModal(m);
	};

	return (
		<div class="msg-code">
			<header class="flex-split" onClick={openPreview}>
				<span>
					<b>Artifact</b> {meta()?.name} ({props.content})
				</span>
			</header>
			<div class="msg-code-body">
				<Show when={meta()}>
					<ArtifactPreview meta={meta()!} />
				</Show>
			</div>
		</div>
	);
};

export default FileMessage;
