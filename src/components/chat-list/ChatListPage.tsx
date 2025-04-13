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

import { chatManager, OngoingChatSummary } from '@/lib/chat-manager/manager';
import { shortRelativeDateFormat } from '@/lib/intl';
import { gotoNewChat } from '@/store/chat';

import { ChatMeta, hasChatUpdate } from '@lib/chat';
import {
	chatListTx,
	clearAllChats as clearChats,
	deleteChatByID,
} from '@lib/idb';

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

type ItemProps = {
	chat: ChatMeta;
	onOpen: (id: string) => void;
	onDelete: (id: string) => void;
};

const Item: Component<ItemProps> = (props) => {
	return (
		<a
			class={
				'panel-block panel-item is-active ' +
				(hasChatUpdate(props.chat) ? 'has-background-warning-soft' : '')
			}
			onClick={() => props.onOpen(props.chat._id)}
		>
			<div class="panel-item-content">
				<div class="panel-item-body">
					<div>
						<Switch>
							<Match when={props.chat.title}>
								<b>{props.chat.title}</b>
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
							new Date(props.chat.createdAt)
						)}
					</div>
					<div>
						<BiRegularCalendarExclamation />
						{shortRelativeDateFormat(
							new Date(props.chat.updatedAt || 0)
						)}
					</div>
				</div>
			</div>
			<button
				class="button is-danger is-outlined is-small"
				onClick={() => props.onDelete(props.chat._id)}
			>
				<span class="icon">
					<TbTrash />
				</span>
			</button>
		</a>
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

	const [ongoing, setOngoing] = createSignal<OngoingChatSummary[]>([]);

	let filterRef: HTMLInputElement;

	const loadChatMeta = async () => {
		const ogs = chatManager.getOngoings();

		const ongoingIDs = new Set(ogs.map((x) => x.meta.id));

		const db = await chatListTx<ChatMeta>();
		const all = await db.getAll();
		console.log('all chats', all, ongoingIDs);
		const notGoings = all.filter((x) => !ongoingIDs.has(x._id));
		console.log('not goings', notGoings);

		setOngoing(
			ogs.sort((a, b) => {
				return (b.ctx.updatedAt || 0) - (a.ctx.updatedAt || 0);
			})
		);
		setChatList(notGoings);
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
		const deleteIDs = filteredList()
			.slice(left)
			.map((x) => x._id);
		await toast.promise(clearChats(deleteIDs), {
			loading: 'Clearing...',
			success: 'Cleared',
			error: 'Failed to clear',
		});
		loadChatMeta();
		setShowClearModal(false);
	};

	const handleFilterChange = () => {
		setFilteredList(filtered());
	};

	const deleteChat = async (id: string) => {
		if (!(await openConfirm('Are you sure to delete this chat?'))) return;
		toast.promise(deleteChatByID(id), {
			loading: 'Deleting...',
			success: 'Deleted',
			error: 'Failed to delete',
		});
		loadChatMeta();
	};

	const openChat = async (id: string) => {
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
						<span>Ongoing Chats ({ongoing()?.length || '-'})</span>
					</p>
					<For each={ongoing()}>
						{(chat) => (
							<Item
								chat={chat.ctx}
								onOpen={openChat}
								onDelete={deleteChat}
							/>
						)}
					</For>
				</nav>
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
									<Item
										chat={chat}
										onOpen={openChat}
										onDelete={deleteChat}
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
