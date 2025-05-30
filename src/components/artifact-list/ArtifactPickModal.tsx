import {
	Component,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
} from 'solid-js';

import { openModal } from '@/components/modal/ModalContainer';
import { ArtifactMeta } from '@/lib/artifact/structs';
import {
	listArtifacts,
	getArtifactBlob,
	getArtifactData,
} from '@/lib/idb/artifact_storage';
import { goto } from '@/store/nav';

type CellProps = {
	meta: ArtifactMeta;
	onClick: () => void;
};

const ArtifactCell: Component<CellProps> = (props) => {
	const [bgImage, setBgImage] = createSignal<string | null>(null);
	const [textPreview, setTextPreview] = createSignal<string | null>(null);

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
		} else {
			const data = await getArtifactData(props.meta._id);
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

	onCleanup(() => {
		cleanUp();
	});

	return (
		<div
			class="cell artifact-cell"
			onClick={() => props.onClick()}
			style={{
				'background-image': bgImage() ? `url(${bgImage()})` : 'none',
			}}
		>
			<div class="has-text-primary">
				<b>{props.meta.mimeType}</b>
				<br />
				{props.meta.name}
			</div>
			<Show when={textPreview()}>
				<div class="pre-wrap">{textPreview()}</div>
			</Show>
		</div>
	);
};

type Meta = ArtifactMeta & {
	lcName: string;
};

export const openArtifactPickModal = (): Promise<string | undefined> => {
	type Props = {
		onClose: (value?: string) => void;
	};
	const component = (props: Props) => {
		let filterRef: HTMLInputElement;

		const [fullArtifactList, setFullArtifactList] = createSignal<Meta[]>(
			[]
		);

		const [artifactList, setArtifactList] = createSignal<Meta[]>([]);

		const pageSize = 10;
		const [maxItems, setMaxItems] = createSignal(pageSize);

		const loadFullArtifacts = async () => {
			const fullArtifacts = await listArtifacts();
			// Sort by createdAt
			fullArtifacts.sort((a, b) => b.createdAt - a.createdAt);
			setFullArtifactList(
				fullArtifacts.map((v) => ({
					...v,
					lcName: v.name.toLowerCase(),
				}))
			);
			updateFilter(filterRef!.value);
		};

		const updateFilter = (query: string) => {
			const lc = query.toLowerCase();
			const filteredArtifacts = fullArtifactList().filter((artifact) =>
				artifact.lcName.includes(lc)
			);
			setArtifactList(filteredArtifacts);
		};

		const handleFilterChange = (event: Event) => {
			const input = event.target as HTMLInputElement;
			updateFilter(input.value);
		};

		onMount(loadFullArtifacts);

		return (
			<div class="box">
				<h3 class="title is-3">Pick an Artifact</h3>
				<div class="mb-2">
					<input
						ref={filterRef!}
						class="input"
						type="text"
						placeholder="Filter..."
						onChange={handleFilterChange}
					/>
				</div>
				<div class="grid is-gap-0 is-col-min-5">
					<For each={artifactList().slice(0, maxItems())}>
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
				<Show when={maxItems() < artifactList().length}>
					<div class="has-text-centered">
						<button
							class="button is-small"
							onClick={() => setMaxItems((s) => s + pageSize)}
						>
							More ({maxItems()} / {artifactList().length})
						</button>
					</div>
				</Show>
				<div class="buttons is-right">
					<button
						class="button"
						onClick={() => {
							goto('/artifacts');
							props.onClose();
						}}
					>
						Go to List
					</button>
					<button class="button" onClick={() => props.onClose()}>
						Cancel
					</button>
				</div>
			</div>
		);
	};

	return openModal(component);
};
