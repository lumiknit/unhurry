import { Component, createSignal, For, onCleanup, onMount } from 'solid-js';

import { openModal } from '@/components/modal/ModalContainer';
import {
	listArtifacts,
	ArtifactMeta,
	getArtifactBlob,
} from '@/lib/idb/artifact_storage';

type CellProps = {
	meta: ArtifactMeta;
	onClick: () => void;
};

const ArtifactCell: Component<CellProps> = (props) => {
	const [bgImage, setBgImage] = createSignal<string | null>(null);

	let cleanUp = () => {};

	onMount(async () => {
		if (props.meta.mimeType.startsWith('image/')) {
			const blob = await getArtifactBlob(props.meta._id);
			if (blob) {
				const url = URL.createObjectURL(blob);
				setBgImage(url);
				cleanUp = () => {
					URL.revokeObjectURL(url);
				};
			}
		}
	});

	onCleanup(() => {
		cleanUp();
	});

	return (
		<a
			class="cell artifact-cell"
			onClick={() => props.onClick()}
			style={{
				'background-image': bgImage() ? `url(${bgImage()})` : 'none',
			}}
		>
			{props.meta.name}
		</a>
	);
};

export const openArtifactPickModal = (): Promise<string | undefined> => {
	type Props = {
		onClose: (value?: string) => void;
	};
	const component = (props: Props) => {
		const [artifactList, setArtifactList] = createSignal<ArtifactMeta[]>(
			[]
		);

		const loadArtifacts = async () => {
			const artifacts = await listArtifacts();
			setArtifactList(artifacts);
		};

		onMount(() => loadArtifacts());

		return (
			<div class="box">
				<h3 class="title is-3">Pick an Artifact</h3>
				<div class="grid is-col-min-2">
					<For each={artifactList()}>
						{(artifact) => (
							<ArtifactCell
								meta={artifact}
								onClick={() => {
									props.onClose(artifact._id);
								}}
							/>
						)}
					</For>
				</div>
				<div class="buttons is-right">
					<button class="button" onClick={() => props.onClose()}>
						Cancel
					</button>
				</div>
			</div>
		);
	};

	return openModal(component);
};
