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

const FileListPage: Component = () => {
	const [fileList, setFileList] = createSignal<FileMeta[] | undefined>();
	const [filteredList, setFilteredList] = createSignal<FileMeta[]>([]);

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
					<p class="panel-heading">
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
							<For each={filteredList()!}>
								{(file) => (
									<a
										class="panel-block is-active flex-split"
										onClick={openFile(file._id)}
									>
										<div>
											<Switch>
												<Match when={file.name}>
													<b>{file.name}</b>
												</Match>
												<Match when>
													<i>{file._id}</i>
												</Match>
											</Switch>
											<br />
											<span class="ml-2 is-size-7">
												{new Date(
													file.createdAt
												).toLocaleString()}
											</span>
										</div>
										<button
											class="button is-danger is-outlined is-small"
											onClick={handleDeleteFile(file._id)}
										>
											<span class="icon">
												<TbTrash />
											</span>
										</button>
									</a>
								)}
							</For>
						</Match>
					</Switch>
				</nav>
			</div>
		</div>
	);
};

export default FileListPage;
