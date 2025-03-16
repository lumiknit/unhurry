import { Component, createSignal } from 'solid-js';

import BottomInput from './BottomInput';
import ChatHistoryView from './ChatHistoryView';
import { cancelRequest, sendUserRequest } from '../../store/actions';

const MainView: Component = () => {
	const [progressing, setProgressing] = createSignal(false);

	const handleSend = async (text: string) => {
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
			}, 100);
			await sendUserRequest(text);
		} finally {
			setProgressing(false);
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
