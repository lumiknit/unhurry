import { useNavigate } from '@solidjs/router';
import {
	BiRegularCalendar,
	BiRegularCalendarExclamation,
	BiRegularPlus,
} from 'solid-icons/bi';
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

import { shortRelativeDateFormat } from '@/lib/intl';
import { gotoNewChat } from '@/store/chat';

import { ChatMeta, hasChatUpdate } from '@lib/chat';
import { chatListTx, clearAllChats, deleteChatByID } from '@lib/idb';

import { loadChatContext } from '@store/global_actions';

import { rootPath } from '../../env';
import { openConfirm } from '../modal-confirm';
import Pagination, { createPaginatedList } from '../utils/Pagination';

type ClearModalProps = {
	onClear: (left: number) => void;
	onClose: () => void;
};

const ClearChatModal: Component<ClearModalProps> = (props) => {
	let cntRef: HTMLInputElement;

	const handleClear = async () => {
		let left = parseInt(cntRef!.value);
		if (isNaN(left)) left = 0;
		left = Math.max(0, left);
		props.onClear(left);
	};

	return (
		<div class="modal is-active">
			<div class="modal-background"></div>
			<div class="modal-content">
				<div class="box">
					<p>Clear all chats except the latest chats</p>
					<div class="field">
						<label class="label">Leave Latest</label>
						<div class="control">
							<input
								ref={cntRef!}
								class="input"
								type="number"
								placeholder="Number of items to leave"
								value="5"
							/>
						</div>
					</div>
					<div class="buttons">
						<button class="button is-danger" onClick={handleClear}>
							Clear
						</button>
						<button class="button" onClick={props.onClose}>
							Cancel
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

const ChatListPage: Component = () => {
	const navigate = useNavigate();

	const [showClearModal, setShowClearModal] = createSignal(false);

	const pageSize = 10;
	const [chatList, setChatList] = createSignal<ChatMeta[] | undefined>();
	const [filteredList, setFilteredList] = createSignal<ChatMeta[]>([]);
	const [page, setPage] = createPaginatedList<ChatMeta>(
		filteredList,
		pageSize
	);

	let filterRef: HTMLInputElement;

	const loadChatMeta = async () => {
		const db = await chatListTx<ChatMeta>();
		const all = await db.getAll();
		setChatList(all);
		sortByLastUsed();
	};

	const filtered = () =>
		chatList()!.filter((x) => x.title.indexOf(filterRef!.value) >= 0);

	const sortByLastUsed = () => {
		setFilteredList(
			filtered().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
		);
	};

	const handleClearAll = async (left: number) => {
		await toast.promise(
			clearAllChats({
				left,
			}),
			{
				loading: 'Clearing...',
				success: 'Cleared',
				error: 'Failed to clear',
			}
		);
		loadChatMeta();
		setShowClearModal(false);
	};

	const handleFilterChange = () => {
		setFilteredList(filtered());
	};

	const deleteChat = (id: string) => async (e: MouseEvent) => {
		e.stopPropagation();
		if (!(await openConfirm('Are you sure to delete this chat?'))) return;
		toast.promise(deleteChatByID(id), {
			loading: 'Deleting...',
			success: 'Deleted',
			error: 'Failed to delete',
		});
		loadChatMeta();
	};

	const openChat = (id: string) => async () => {
		toast.promise(
			(async () => {
				await loadChatContext(id);
				// Navigate to chat view
				navigate(`${rootPath}/`);
			})(),
			{
				loading: 'Loading...',
				success: 'Loaded',
				error: 'Failed to load',
			}
		);
	};
	onMount(() => loadChatMeta());

	return (
		<div class="container">
			<Show when={showClearModal()}>
				<ClearChatModal
					onClose={() => setShowClearModal(false)}
					onClear={handleClearAll}
				/>
			</Show>
			<div class="m-2">
				<nav class="panel is-primary">
					<p class="panel-block has-background-text-soft has-text-weight-bold flex-split">
						<span>Chats ({chatList()?.length || '-'})</span>
						<button
							class="button is-small is-primary"
							onClick={() => gotoNewChat(navigate)}
						>
							<span class="icon mr-1">
								<BiRegularPlus />
							</span>
							New Chat
						</button>
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
						<Match when={chatList() === undefined}>
							<a class="panel-block is-active">
								<span class="spinner" /> Loading...
							</a>
						</Match>
						<Match when>
							<For each={page().items}>
								{(chat) => (
									<a
										class={
											'panel-block panel-item is-active ' +
											(hasChatUpdate(chat)
												? 'has-background-warning-soft'
												: '')
										}
										onClick={openChat(chat._id)}
									>
										<div class="panel-item-content">
											<div class="panel-item-body">
												<div>
													<Switch>
														<Match
															when={chat.title}
														>
															<b>{chat.title}</b>
														</Match>
														<Match when>
															<i>Untitled</i>
														</Match>
													</Switch>
												</div>
											</div>
											<div class="panel-item-date">
												<div>
													<BiRegularCalendar />
													{shortRelativeDateFormat(
														new Date(chat.createdAt)
													)}
												</div>
												<div>
													<BiRegularCalendarExclamation />
													{shortRelativeDateFormat(
														new Date(
															chat.updatedAt || 0
														)
													)}
												</div>
											</div>
										</div>
										<button
											class="button is-danger is-outlined is-small"
											onClick={deleteChat(chat._id)}
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
				<Pagination
					currentPage={page().page}
					totalPages={page().totalPages}
					onPageChange={setPage}
				/>
				<p class="control is-fullwidth">
					<button
						class="button is-danger is-outlined is-fullwidth"
						onClick={() => setShowClearModal(true)}
					>
						Clear All
					</button>
				</p>
			</div>
		</div>
	);
};

export default ChatListPage;
