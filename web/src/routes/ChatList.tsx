import { useNavigate } from '@solidjs/router';
import { Component, createSignal, For, onMount } from 'solid-js';
import './ChatList.scss';

interface ChatItem {
	id: string;
	title: string;
	createdAt: string;
}

const ChatList: Component = () => {
	const navigate = useNavigate();
	const [chats, setChats] = createSignal<ChatItem[]>([]);
	const [loading, setLoading] = createSignal(true);

	onMount(() => {
		// TODO: Fetch chats from API or storage
		setLoading(false);
	});

	const handleChatClick = (id: string) => {
		navigate(`/?chatId=${id}`);
	};

	return (
		<div class="chat-list-container">
			<section class="section">
				<div class="container">
					<h1 class="title">Chat List</h1>

					{loading() ? (
						<div class="has-text-centered">
							<span class="loader"></span>
						</div>
					) : chats().length === 0 ? (
						<div class="box has-text-centered">
							<p class="is-size-5">No chats yet</p>
							<button
								class="button is-primary mt-4"
								onClick={() => navigate('/')}
							>
								Start New Chat
							</button>
						</div>
					) : (
						<div class="columns is-multiline">
							<For each={chats()}>
								{(chat) => (
									<div class="column is-full">
										<div
											class="box is-clickable"
											onClick={() =>
												handleChatClick(chat.id)
											}
										>
											<h2 class="title is-5">
												{chat.title}
											</h2>
											<p class="is-size-7 has-text-grey">
												{new Date(
													chat.createdAt
												).toLocaleString()}
											</p>
										</div>
									</div>
								)}
							</For>
						</div>
					)}
				</div>
			</section>
		</div>
	);
};

export default ChatList;
