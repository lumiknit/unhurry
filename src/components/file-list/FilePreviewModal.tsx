import { Component, createSignal, Match, onMount, Switch } from 'solid-js';

import { FileMeta, getFileBlob, getFileDataURL } from '@/lib/idb/file_storage';

interface Props {
	meta: FileMeta;
	onClose: () => void;
}

const FilePreviewModal: Component<Props> = (props) => {
	const [imageDataURL, setImageDataURL] = createSignal('');
	const [objURL, setObjURL] = createSignal<string | undefined>();

	onMount(async () => {
		if (props.meta.mimeType.startsWith('image/')) {
			const data = await getFileDataURL(props.meta._id);
			setImageDataURL(data!);
		} else {
			const blob = await getFileBlob(props.meta._id);
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
								<a href={objURL()} download={props.meta.name}>
									Download {props.meta.name}
								</a>
							</Match>
						</Switch>
					</p>
					<div class="buttons is-right">
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

export default FilePreviewModal;
