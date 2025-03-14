import { Component, createSignal, onMount, Show } from 'solid-js';

import BottomInput from './BottomInput';
import ChatHistoryView from './ChatHistoryView';
import { sendUserRequest } from '../../store/actions';

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
			<div class="bottom-sticky container">
				<Show when={progressing()}>
					<progress
						class="progress is-small is-primary p-0"
						max="100"
					/>
				</Show>
				<BottomInput onInput={handleSend} />
			</div>
		</>
	);
};

export default MainView;
