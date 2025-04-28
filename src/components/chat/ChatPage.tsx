import { Component } from 'solid-js';

import BottomInput from './bottom/BottomInput';
import ChatHistoryView from './ChatHistoryView';

const ChatPage: Component = () => {
	return (
		<>
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
