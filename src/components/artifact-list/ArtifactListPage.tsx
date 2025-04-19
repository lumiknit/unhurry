import { BiRegularCalendar } from 'solid-icons/bi';
import { TbTrash } from 'solid-icons/tb';
import {
	Component,
	createSignal,
	For,
	Match,
	onMount,
	Show,
	Switch,
} from 'solid-js';
import { toast } from 'solid-toast';

import { openConfirm } from '@/components/modal';
import {
	deleteAllArtifacts,
	ArtifactMeta,
	listArtifacts,
	deleteArtifact,
	getArtifact,
} from '@/lib/idb/artifact_storage';
import { shortRelativeDateFormat } from '@/lib/intl';

import ArtifactPreviewModal from './ArtifactPreviewModal';
import Pagination, { createPaginatedList } from '../utils/Pagination';

type ItemProps = {
	file: ArtifactMeta;
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
							<Match when={props.file.name}>
								<b>{props.file.name}</b>
							</Match>
							<Match when>
								<i>{props.file._id}</i>
							</Match>
						</Switch>
					</div>
				</div>
				<div class="panel-item-date">
					<div>
						<BiRegularCalendar />
						{shortRelativeDateFormat(
							new Date(props.file.createdAt)
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

	const [openedFileMeta, setOpenedFileMeta] =
		createSignal<ArtifactMeta | null>(null);

	const openFile = (id: string) => async () => {
		const meta = await getArtifact(id);
		if (!meta) {
			toast.error('File not found');
			return;
		}
		setOpenedFileMeta(meta);
	};

	const handleCloseFile = () => {
		setOpenedFileMeta(null);
	};

	onMount(() => loadFileMeta());

	return (
		<div class="container">
			<Show when={openedFileMeta()}>
				<ArtifactPreviewModal
					meta={openedFileMeta()!}
					onClose={handleCloseFile}
				/>
			</Show>
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
										file={file}
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
