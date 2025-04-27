import { Component, createSignal, Match, onMount, Switch } from 'solid-js';

import { openArtifactPreviewModal } from '@/components/artifact-list/ArtifactPreviewModal';
import { ArtifactMeta } from '@/lib/artifact/structs';
import {
	getArtifactMeta,
	getArtifactDataURL,
	getArtifactData,
} from '@/lib/idb/artifact_storage';

import { ItemProps } from './message_types';

const FileMessage: Component<ItemProps> = (props) => {
	const [meta, setMeta] = createSignal<ArtifactMeta | null | undefined>();

	const [imageDataURL, setImageDataURL] = createSignal('');
	const [textPreview, setTextPreview] = createSignal('');

	onMount(async () => {
		const meta = await getArtifactMeta(props.content);
		if (!meta) {
			setMeta(null);
			return;
		}
		setMeta(meta);

		if (meta.mimeType.startsWith('image/')) {
			const data = await getArtifactDataURL(props.content);
			setImageDataURL(data!);
		} else {
			const data = await getArtifactData(props.content);
			if (data && data.data.length < 16 * 1024) {
				if (typeof data.data === 'string') {
					setTextPreview(data.data);
				} else {
					const decoder = new TextDecoder();
					setTextPreview(decoder.decode(data.data));
				}
			}
		}
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
				<Switch>
					<Match when={meta() === null}>
						<strong>
							<i>File not found</i>
						</strong>
					</Match>
					<Match when={meta() === undefined}>
						<strong>
							<i>Loading...</i>
						</strong>
					</Match>
					<Match when={meta()?.mimeType.startsWith('image/')}>
						<img src={imageDataURL()} alt={props.content} />
					</Match>
					<Match when={textPreview()}>{textPreview()}</Match>
					<Match when>No preview available. Click to view.</Match>
				</Switch>
			</div>
		</div>
	);
};

export default FileMessage;
