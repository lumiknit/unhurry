import { Component, createSignal, onMount } from 'solid-js';

import BottomInput from './BottomInput';
import ChatHistoryView from './ChatHistoryView';
import { cancelRequest, sendUserRequest } from '../../store/actions';

const MainView: Component = () => {
	const [progressing, setProgressing] = createSignal(false);

	const handleSend = async (text: string) => {
		console.log('LLM Input: ', text);
		setProgressing(true);
		try {
			await sendUserRequest(text);
		} finally {
			setProgressing(false);
		}
	};

	const handleCancel = () => {
		cancelRequest();
	};

	onMount(() => {
		// Scroll to bottom
		setTimeout(() => {
			window.scrollTo({
				top: document.body.scrollHeight,
				behavior: 'smooth',
			});
		}, 400);
	});

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
