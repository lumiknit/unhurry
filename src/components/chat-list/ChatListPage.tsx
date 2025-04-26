import {
	BiRegularCalendar,
	BiRegularCalendarExclamation,
	BiRegularPlus,
} from 'solid-icons/bi';
import { TbTrash, TbX } from 'solid-icons/tb';
import {
	Component,
	createSignal,
	For,
	Match,
	onMount,
	Show,
	Switch,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { toast } from 'solid-toast';

import { openConfirm } from '@/components/modal';
import { chatManager } from '@/lib/chat-manager/manager';
import { OngoingChatSummary } from '@/lib/chat-manager/structs';
import { shortRelativeDateFormat } from '@/lib/intl';
import { getChatContext } from '@/store';
import { gotoNewChat, openChat } from '@/store/global_actions';

import { ChatMeta, hasChatUpdate } from '@lib/chat';
import {
	chatListTx,
	clearAllChats as clearChats,
	deleteChatByID,
} from '@lib/idb';

import Buttons from '../utils/Buttons';
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
						<Buttons
							autofocus
							onEscape={() => props.onClose()}
							buttons={[
								{
									class: 'button is-danger',
									label: 'OK',
									onClick: () => handleClear(),
								},
								{
									class: 'button',
									label: 'Cancel',
									onClick: () => props.onClose(),
								},
							]}
						/>
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

	/** Whether LLM is running */
	progressing?: boolean;

	deleteIcon: Component;

	onOpen: (id: string) => void;
	onDelete: (id: string) => void;
};

const Item: Component<ItemProps> = (props) => {
	let color = '';
	if (hasChatUpdate(props.chat)) {
		color = 'has-background-warning-soft';
	} else if (getChatContext()._id === props.chat._id) {
		color = 'has-background-info-soft';
	}
	return (
		<a
			class={'panel-block panel-item is-active ' + color}
			onClick={() => props.onOpen(props.chat._id)}
		>
			<div class="panel-item-content">
				<div class="panel-item-body">
					<div>
						<Show when={props.progressing}>
							<span class="spinner" />
						</Show>
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
				class="button is-danger is-small"
				onClick={(e) => {
					e.stopPropagation();
					props.onDelete(props.chat._id);
				}}
			>
				<span class="icon">
					<Dynamic component={props.deleteIcon} />
				</span>
			</button>
		</a>
	);
};

const ChatListPage: Component = () => {
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
		const notGoings = all.filter((x) => !ongoingIDs.has(x._id));

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

	const unloadChat = async (id: string) => {
		if (!(await openConfirm('Are you sure to unload this chat?'))) return;
		chatManager.unloadChat(id);
		toast.success('Canceled');
		loadChatMeta();
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

	const handleOpenChat = async (id: string) => {
		toast.promise(openChat(id), {
			loading: 'Loading...',
			success: 'Loaded',
			error: 'Failed to load',
		});
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
								progressing={chat.progressing}
								deleteIcon={TbX}
								onOpen={handleOpenChat}
								onDelete={unloadChat}
							/>
						)}
					</For>
				</nav>
				<nav class="panel is-primary">
					<p class="panel-block has-background-text-soft has-text-weight-bold flex-split">
						<span>Chats ({chatList()?.length || '-'})</span>
						<button
							class="button is-small is-primary"
							onClick={() => gotoNewChat()}
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
										deleteIcon={TbTrash}
										onOpen={handleOpenChat}
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
