import { Component, createSignal } from 'solid-js';

import { RateLimitError } from '@lib/llm';

import { getChatContext, saveChatContextMeta, setChatContext } from '@store';

import BottomInput from './BottomInput';
import ChatHistoryView from './ChatHistoryView';
import {
	cancelRequest,
	generateChatTitle,
	sendUserRequest,
} from '../../store/actions';

const MainView: Component = () => {
	const [progressing, setProgressing] = createSignal(false);

	const handleSend = async (text: string) => {
		const isFirst = getChatContext().history.msgPairs.length === 0;

		console.log('LLM Input: ', text);
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
					console.log(last, top);
					window.scrollTo({
						top,
						behavior: 'smooth',
					});
				}
			}, 33);
			await sendUserRequest(text);
		} catch (e) {
			if (e instanceof RateLimitError) {
				setProgressing(false);
				throw e;
			}
		} finally {
			setProgressing(false);
		}

		if (isFirst) {
			// Generate a title
			const title = await generateChatTitle();
			console.log('Generated title: ', title);
			setChatContext((c) => ({ ...c, title }));
			saveChatContextMeta();
		}
	};

	const handleCancel = () => {
		cancelRequest();
	};

	return (
		<>
			<div class="top-pad" />
			<div class="container p-1">
				<ChatHistoryView />
			</div>
			<BottomInput
				progressing={progressing()}
				send={handleSend}
				cancel={handleCancel}
			/>
		</>
	);
};

export default MainView;
