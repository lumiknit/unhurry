import { useNavigate } from '@solidjs/router';
import { Component, onMount } from 'solid-js';

import { chatListTx } from '../../lib/db/dbs';

interface ChatListItem {
	_id: string;
	title: string;
	createdAt: string;
}

/** Home Page root component */
const Page: Component = () => {
	const navigate = useNavigate();

	onMount(async () => {
		// Check last used chat from localStorage
		const lastChatId = localStorage.getItem('lastChatId');
		if (lastChatId) {
			navigate(`/chats/${lastChatId}`, { replace: true });
			return;
		}

		// Check chatListIDB for existing chats
		try {
			const tx = await chatListTx<ChatListItem>();
			const chats = await tx.getAll();
			if (chats.length > 0) {
				// Sort by createdAt desc, navigate to most recent
				const sorted = [...chats].sort(
					(a, b) =>
						new Date(b.createdAt).getTime() -
						new Date(a.createdAt).getTime()
				);
				const id = sorted[0]._id as string;
				localStorage.setItem('lastChatId', id);
				navigate(`/chats/${id}`, { replace: true });
				return;
			}
		} catch {
			// ignore DB errors
		}

		// Create a new chat
		const newId = crypto.randomUUID();
		try {
			const tx = await chatListTx<ChatListItem>();
			await tx.put({
				_id: newId,
				title: 'New Chat',
				createdAt: new Date().toISOString(),
			});
		} catch {
			// ignore
		}
		localStorage.setItem('lastChatId', newId);
		navigate(`/chats/${newId}`, { replace: true });
	});

	return <></>;
};

export default Page;
