import { Component, createSignal, Match, onMount, Switch } from 'solid-js';

import { getBEService } from '@/lib/be';
import {
	ArtifactMeta,
	getArtifactBlob,
	getArtifactDataURL,
} from '@/lib/idb/artifact_storage';

interface Props {
	meta: ArtifactMeta;
	onClose: () => void;
}

const ArtifactPreviewModal: Component<Props> = (props) => {
	const [imageDataURL, setImageDataURL] = createSignal('');
	const [objURL, setObjURL] = createSignal<string | undefined>();

	const handleDownload = async () => {
		const be = await getBEService();
		const blob = await getArtifactBlob(props.meta._id);
		if (blob) {
			be.downloadFile(props.meta.name, blob);
		}
	};

	onMount(async () => {
		if (props.meta.mimeType.startsWith('image/')) {
			const data = await getArtifactDataURL(props.meta._id);
			setImageDataURL(data!);
		} else {
			const blob = await getArtifactBlob(props.meta._id);
			if (blob) {
				setObjURL(URL.createObjectURL(blob));
			}
		}
	});

	return (
		<div class="modal is-active">
			<div class="modal-background" onClick={props.onClose} />
			<div class="modal-content">
				<div class="box">
					<p>
						<Switch>
							<Match when={props.meta === null}>
								<strong>
									<i>File not found</i>
								</strong>
							</Match>
							<Match when={props.meta === undefined}>
								<strong>
									<i>Loading...</i>
								</strong>
							</Match>
							<Match
								when={props.meta.mimeType.startsWith('image/')}
							>
								<img
									src={imageDataURL()}
									alt={props.meta._id}
								/>
							</Match>
							<Match when={objURL()}>
								<textarea class="textarea">{objURL()}</textarea>
							</Match>
						</Switch>
					</p>
					<div class="buttons is-right mt-2">
						<button class="button" onClick={handleDownload}>
							Download
						</button>
						<button class="button" onClick={props.onClose}>
							Close
						</button>
					</div>
				</div>
			</div>
			<button
				class="modal-close is-large"
				aria-label="close"
				onClick={props.onClose}
			></button>
		</div>
	);
};

export default ArtifactPreviewModal;
