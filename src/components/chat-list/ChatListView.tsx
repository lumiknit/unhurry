import { useNavigate } from '@solidjs/router';
import { TbNote, TbTrash } from 'solid-icons/tb';
import { Component, createSignal, For, Match, onMount, Switch } from 'solid-js';
import { toast } from 'solid-toast';

import { rootPath } from '../../env';
import { ChatMeta } from '../../lib/chat';
import { chatListTx, clearAllChats, deleteChatByID } from '../../lib/idb';
import { loadChatContext } from '../../store';

const ChatListView: Component = () => {
	const [chatList, setChatList] = createSignal<ChatMeta[] | undefined>();
	const navigate = useNavigate();

	const loadChatMeta = async () => {
		const db = await chatListTx<ChatMeta>();
		const all = await db.getAll();
		setChatList(all.reverse());
	};

	const handleClearAll = async () => {
		if (!confirm('Are you sure to clear all chat history?')) return;
		toast.promise(clearAllChats(), {
			loading: 'Clearing...',
			success: 'Cleared',
			error: 'Failed to clear',
		});
		loadChatMeta();
	};

	const deleteChat = (id: string) => async (e: MouseEvent) => {
		e.stopPropagation();
		if (!confirm('Are you sure to delete this chat?')) return;
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
					<p class="panel-heading"> Chats </p>
					<div class="panel-block">
						<p class="control has-icons-left">
							<button
								class="button is-danger is-outlined is-fullwidth"
								onClick={handleClearAll}
							>
								Clear All
							</button>
						</p>
					</div>
					<Switch>
						<Match when={chatList() === undefined}>
							<a class="panel-block is-active">
								<span class="spinner" /> Loading...
							</a>
						</Match>
						<Match when>
							<For each={chatList()!}>
								{(chat) => (
									<a
										class="panel-block is-active flex-split"
										onClick={openChat(chat._id)}
									>
										<div>
											<TbNote />
											<Switch>
												<Match when={chat.title}>
													<span>{chat.title}</span>
												</Match>
												<Match when>
													<i>Untitled</i>
												</Match>
											</Switch>
											<span class="ml-2">
												-{' '}
												{new Date(
													chat.createdAt
												).toLocaleString()}
											</span>
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
			</div>
		</div>
	);
};

export default ChatListView;
