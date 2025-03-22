import { Component } from 'solid-js';

import BottomInput from './BottomInput';
import ChatHistoryView from './ChatHistoryView';

const ChatPage: Component = () => {
	return (
		<>
			<div class="top-pad" />
			<div class="container p-1">
				<ChatHistoryView />
			</div>
			<div class="bottom-fixed container">
				<BottomInput />
			</div>
		</>
	);
};

export default ChatPage;
