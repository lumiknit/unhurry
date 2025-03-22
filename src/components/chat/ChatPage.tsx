import { Component, createSignal } from 'solid-js';

import { RateLimitError } from '@lib/llm';
import { logr } from '@lib/logr';

import { getChatContext, saveChatContextMeta, setChatContext } from '@store';

import BottomInput from './BottomInput';
import ChatHistoryView from './ChatHistoryView';
import { cancelAllChats, chat, generateChatTitle } from '../../store/actions';

const ChatPage: Component = () => {
	const [progressing, setProgressing] = createSignal(false);

	const handleSend = async (text: string) => {
		const isFirst = getChatContext().history.msgPairs.length === 0;

		logr.info('LLM Input: ', text);
		setProgressing(true);
		try {
			// Pick the last user message and scroll to top.
			setTimeout(() => {
				const elems = document.getElementsByClassName('msg-user');
				if (elems.length > 0) {
					const last = elems[elems.length - 1];
					const rect = last.getBoundingClientRect();
					const top = window.scrollY + rect.top - 54;
					// current scroll position
					window.scrollTo({
						top,
						behavior: 'smooth',
					});
				}
			}, 33);
			await chat(text);
		} catch (e) {
			if (e instanceof RateLimitError) {
				logr.warn('[ChatPage] Rate limit error: ', e);
				setProgressing(false);
				throw e;
			}
			logr.error('[ChatPage] Error sending user request: ', e);
		} finally {
			setProgressing(false);
		}

		if (isFirst) {
			// Generate a title
			const title = await generateChatTitle();
			logr.info('[ChatPage] Generated title: ', title);
			setChatContext((c) => ({ ...c, title }));
			saveChatContextMeta();
		}
	};

	const handleCancel = () => {
		logr.info('[ChatPage] Canceling request');
		cancelAllChats();
	};

	return (
		<>
			<div class="top-pad" />
			<div class="container p-1">
				<ChatHistoryView />
			</div>
			<div class="bottom-fixed container">
				<BottomInput
					progressing={progressing()}
					send={handleSend}
					cancel={handleCancel}
				/>
			</div>
		</>
	);
};

export default ChatPage;
