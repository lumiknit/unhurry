import { Component, createSignal, Match, onMount, Switch } from 'solid-js';

import { openArtifactPreviewModal } from '@/components/artifact-list/ArtifactPreviewModal';
import {
	ArtifactMeta,
	getArtifactMeta,
	getArtifactBlob,
	getArtifactDataURL,
} from '@/lib/idb/artifact_storage';

import { ItemProps } from './message_types';

const FileMessage: Component<ItemProps> = (props) => {
	const [meta, setMeta] = createSignal<ArtifactMeta | null | undefined>();

	const [imageDataURL, setImageDataURL] = createSignal('');
	const [objURL, setObjURL] = createSignal<string | undefined>();

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
			const blob = await getArtifactBlob(props.content);
			if (blob) {
				setObjURL(URL.createObjectURL(blob));
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
					<Match when={objURL()}>
						<a href={objURL()} download={meta()!.name}>
							Download {meta()!.name}
						</a>
					</Match>
				</Switch>
			</div>
		</div>
	);
};

export default FileMessage;
