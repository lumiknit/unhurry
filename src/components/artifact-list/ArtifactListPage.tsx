import { useSearchParams } from '@solidjs/router';
import {
	BiRegularCalendar,
	BiSolidFilePlus,
	BiSolidImageAdd,
} from 'solid-icons/bi';
import { TbTrash } from 'solid-icons/tb';
import { Component, createSignal, For, Match, onMount, Switch } from 'solid-js';
import { toast } from 'solid-toast';

import { openConfirm } from '@/components/modal';
import {
	deleteAllArtifacts,
	ArtifactMeta,
	listArtifacts,
	deleteArtifact,
	getArtifactMeta,
} from '@/lib/idb/artifact_storage';
import { shortRelativeDateFormat } from '@/lib/intl';
import { goto } from '@/store';

import { openArtifactPreviewModal } from './ArtifactPreviewModal';
import Pagination, { createPaginatedList } from '../utils/Pagination';

type ItemProps = {
	meta: ArtifactMeta;
	onOpen: () => void;
	onDelete: () => void;
};

const ArtifactListItem: Component<ItemProps> = (props) => {
	return (
		<a class="panel-block panel-item" onClick={props.onOpen}>
			<div class="panel-item-content">
				<div class="panel-item-body">
					<div class="panel-item-title">
						<Switch>
							<Match when={props.meta.name}>
								<b>{props.meta.name}</b>
							</Match>
							<Match when>
								<i>{props.meta._id}</i>
							</Match>
						</Switch>
					</div>
					<div class="is-size-7">
						{props.meta.mimeType} <code>{props.meta._id}</code>
					</div>
				</div>
				<div class="panel-item-date">
					<div>
						<BiRegularCalendar />
						{shortRelativeDateFormat(
							new Date(props.meta.createdAt)
						)}
					</div>
				</div>
			</div>
			<button
				class="button is-danger is-outlined is-small"
				onClick={props.onDelete}
			>
				<span class="icon">
					<TbTrash />
				</span>
			</button>
		</a>
	);
};

const ArtifactListPage: Component = () => {
	const [searchParams] = useSearchParams();

	const pageSize = 10;
	const [artifactList, setArtifactList] = createSignal<
		ArtifactMeta[] | undefined
	>();
	const [filteredList, setFilteredList] = createSignal<ArtifactMeta[]>([]);
	const [page, setPage] = createPaginatedList<ArtifactMeta>(
		filteredList,
		pageSize
	);

	let filterRef: HTMLInputElement;

	const loadFileMeta = async () => {
		const metas = await listArtifacts();
		setArtifactList(metas);
		sortByCreatedAt();
	};

	const filtered = () =>
		artifactList()!.filter(
			(x) => (x.name + ' ' + x._id).indexOf(filterRef!.value) >= 0
		);

	const sortByCreatedAt = () => {
		setFilteredList(
			filtered().sort((a, b) =>
				(a.createdAt || 0) < (b.createdAt || 0) ? 1 : -1
			)
		);
	};

	const handleClearAll = async () => {
		if (!(await openConfirm('Are you sure to delete all files?'))) return;
		await toast.promise(deleteAllArtifacts(), {
			loading: 'Deleting...',
			success: 'Deleted',
			error: 'Failed to delete',
		});
		// Reload
		await loadFileMeta();
	};

	const handleFilterChange = () => {
		setFilteredList(filtered());
	};

	const handleDeleteFile = (id: string) => async (e: MouseEvent) => {
		e.stopPropagation();
		if (!(await openConfirm('Are you sure to delete this file?'))) return;
		toast.promise(deleteArtifact(id), {
			loading: 'Deleting...',
			success: 'Deleted',
			error: 'Failed to delete',
		});
		loadFileMeta();
	};

	const openFile = (id: string) => async () => {
		const meta = await getArtifactMeta(id);
		if (!meta) {
			toast.error('File not found');
			return;
		}
		const changed = await openArtifactPreviewModal(meta);
		if (changed) {
			await loadFileMeta();
		}
	};

	onMount(() => {
		filterRef!.value = `${searchParams.q || ''}`;
		loadFileMeta();
	});

	return (
		<div class="container">
			<div class="m-2">
				<nav class="panel is-primary">
					<p class="panel-block has-background-text-soft has-text-weight-bold">
						Artifacts ({filteredList().length}/
						{artifactList()?.length})
					</p>
					<div class="panel-block">
						<p class="control">
							<input
								ref={filterRef!}
								class="input"
								type="text"
								placeholder="Filter by..."
								onInput={handleFilterChange}
							/>
						</p>
					</div>
					<Switch>
						<Match when={artifactList() === undefined}>
							<a class="panel-block is-active">
								<span class="spinner" /> Loading...
							</a>
						</Match>
						<Match when>
							<For each={page().items}>
								{(file) => (
									<ArtifactListItem
										meta={file}
										onOpen={openFile(file._id)}
										onDelete={() =>
											handleDeleteFile(file._id)
										}
									/>
								)}
							</For>
						</Match>
					</Switch>
				</nav>
				<Pagination
					currentPage={page().page}
					totalPages={page().totalPages}
					onPageChange={setPage}
				/>
				<div class="my-2">
					<button
						class="button is-primary is-outlined"
						onClick={() => goto('/canvas/_/text')}
					>
						<span class="icon">
							<BiSolidFilePlus />
						</span>
						<span>Text </span>
					</button>
					<button
						class="button is-primary is-outlined"
						onClick={() => goto('/canvas/_/image')}
					>
						<span class="icon">
							<BiSolidImageAdd />
						</span>
						<span>Image</span>
					</button>
				</div>

				<p class="control is-fullwidth">
					<button
						class="button is-danger is-outlined is-fullwidth"
						onClick={handleClearAll}
					>
						Clear All
					</button>
				</p>
			</div>
		</div>
	);
};

export default ArtifactListPage;
