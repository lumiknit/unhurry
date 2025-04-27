import {
	Component,
	createSignal,
	onMount,
	Switch,
	Match,
	onCleanup,
} from 'solid-js';

import { ArtifactMeta } from '@/lib/artifact/structs';
import {
	getArtifactBlob,
	getArtifactDataString,
} from '@/lib/idb/artifact_storage';

import hljs from '@lib/hljs';

interface Props {
	meta: ArtifactMeta;
}

const ArtifactPreview: Component<Props> = (props) => {
	const [imgURL, setImgURL] = createSignal<string | null>(null);
	const [text, setText] = createSignal<string | null>(null);
	const [highlightedText, setHighlightedText] = createSignal<string | null>(
		null
	);

	let cleanUp = () => {};

	onMount(async () => {
		console.log(props.meta);
		if (props.meta.mimeType.startsWith('image/')) {
			const blob = await getArtifactBlob(props.meta._id);
			if (!blob) {
				setText('(Failed to load image)');
				return;
			}
			const url = URL.createObjectURL(blob);
			setImgURL(url);
			cleanUp = () => {
				URL.revokeObjectURL(url);
			};
		} else {
			try {
				const s = await getArtifactDataString(props.meta._id);
				if (s.length > 128 * 1024) {
					setText('(File is too large to preview)');
				} else {
					setText(s);

					// Syntax highlighting
					const highlighted = hljs.highlightAuto(s).value;
					setHighlightedText(highlighted);
				}
			} catch {
				setText('(Binary data, cannot preview)');
			}
		}
	});

	onCleanup(() => {
		cleanUp();
	});

	return (
		<Switch>
			<Match when={imgURL()}>
				<img src={imgURL()!} alt="Artifact Preview" />
			</Match>
			<Match when={highlightedText()}>
				<div class="msg-code-body" innerHTML={highlightedText()!} />
			</Match>
			<Match when={text()}>
				<div>{text()}</div>
			</Match>
		</Switch>
	);
};

export default ArtifactPreview;
