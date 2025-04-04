import { useNavigate } from '@solidjs/router';
import { BiRegularCalendar } from 'solid-icons/bi';
import { TbTrash } from 'solid-icons/tb';
import { Component, createSignal, For, Match, onMount, Switch } from 'solid-js';
import { toast } from 'solid-toast';

import { shortRelativeDateFormat } from '@/lib/intl';

import { ChatMeta } from '@lib/chat';
import { chatListTx, clearAllChats, deleteChatByID } from '@lib/idb';

import { loadChatContext } from '@store/index';

import { rootPath } from '../../env';
import { openConfirm } from '../modal-confirm';
import Pagination, { createPaginatedList } from '../utils/Pagination';

const ChatListPage: Component = () => {
	const pageSize = 10;
	const [chatList, setChatList] = createSignal<ChatMeta[] | undefined>();
	const [filteredList, setFilteredList] = createSignal<ChatMeta[]>([]);
	const [page, setPage] = createPaginatedList<ChatMeta>(
		filteredList,
		pageSize
	);

	let clearLeftRef: HTMLInputElement;
	let filterRef: HTMLInputElement;

	const navigate = useNavigate();

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
			filtered().sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
		);
	};

	const handleClearAll = async () => {
		let left = parseInt(clearLeftRef!.value);
		if (isNaN(left)) left = 0;
		left = Math.max(0, left);

		const msg = left > 0 ? ` except ${left} latest ones` : '';
		if (!(await openConfirm(`Are you sure to delete all chats${msg}?`)))
			return;
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
			<div class="m-2">
				<nav class="panel is-primary">
					<p class="panel-block has-background-text-soft has-text-weight-bold">
						Chats ({chatList()?.length || '-'})
					</p>
					<div class="panel-block">
						<div>
							<p class="control">
								<button
									class="button is-danger is-outlined is-fullwidth"
									onClick={handleClearAll}
								>
									Clear All
								</button>
							</p>
							<p class="control">
								Keep
								<input
									ref={clearLeftRef!}
									class="input"
									type="number"
									placeholder="Except"
									value="5"
								/>
							</p>
						</div>
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
						<Match when={chatList() === undefined}>
							<a class="panel-block is-active">
								<span class="spinner" /> Loading...
							</a>
						</Match>
						<Match when>
							<For each={page().items}>
								{(chat) => (
									<a
										class="panel-block panel-item is-active"
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
			</div>
		</div>
	);
};

export default ChatListPage;
