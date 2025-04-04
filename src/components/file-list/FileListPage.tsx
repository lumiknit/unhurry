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

import {
	deleteAllFiles,
	FileMeta,
	listFiles,
	deleteFile,
	getFile,
} from '@/lib/idb/file_storage';

import FilePreviewModal from './FilePreviewModal';
import { openConfirm } from '../modal-confirm';
import Pagination, { createPaginatedList } from '../utils/Pagination';

type ItemProps = {
	file: FileMeta;
	onOpen: () => void;
	onDelete: () => void;
};

const FileListItem: Component<ItemProps> = (props) => {
	return (
		<a class="panel-block is-active flex-split" onClick={props.onOpen}>
			<div>
				<Switch>
					<Match when={props.file.name}>
						<b>{props.file.name}</b>
					</Match>
					<Match when>
						<i>{props.file._id}</i>
					</Match>
				</Switch>
				<br />
				<span class="ml-2 is-size-7">
					{new Date(props.file.createdAt).toLocaleString()}
				</span>
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

const FileListPage: Component = () => {
	const pageSize = 10;
	const [fileList, setFileList] = createSignal<FileMeta[] | undefined>();
	const [filteredList, setFilteredList] = createSignal<FileMeta[]>([]);
	const [page, setPage] = createPaginatedList<FileMeta>(
		filteredList,
		pageSize
	);

	let filterRef: HTMLInputElement;

	const loadFileMeta = async () => {
		const metas = await listFiles();
		setFileList(metas);
		sortByCreatedAt();
	};

	const filtered = () =>
		fileList()!.filter(
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
		await toast.promise(deleteAllFiles(), {
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
		toast.promise(deleteFile(id), {
			loading: 'Deleting...',
			success: 'Deleted',
			error: 'Failed to delete',
		});
		loadFileMeta();
	};

	const [openedFileMeta, setOpenedFileMeta] = createSignal<FileMeta | null>(
		null
	);

	const openFile = (id: string) => async () => {
		const meta = await getFile(id);
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
				<FilePreviewModal
					meta={openedFileMeta()!}
					onClose={handleCloseFile}
				/>
			</Show>
			<div class="m-2">
				<nav class="panel is-primary">
					<p class="panel-block has-background-text-soft has-text-weight-bold">
						Files ({filteredList().length} / {fileList()?.length})
					</p>
					<div class="panel-block">
						<p class="control">
							<button
								class="button is-danger is-outlined is-fullwidth"
								onClick={handleClearAll}
							>
								Clear All
							</button>
						</p>
					</div>
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
						<Match when={fileList() === undefined}>
							<a class="panel-block is-active">
								<span class="spinner" /> Loading...
							</a>
						</Match>
						<Match when>
							<For each={page().items}>
								{(file) => (
									<FileListItem
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
			</div>
		</div>
	);
};

export default FileListPage;
