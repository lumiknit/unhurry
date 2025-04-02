import { Component, onCleanup, onMount } from 'solid-js';

import BottomInput from './bottom/BottomInput';
import ChatHistoryView from './ChatHistoryView';
import { globalShortcutHandler } from './lib';

const ChatPage: Component = () => {
	onMount(() => {
		window.addEventListener('keydown', globalShortcutHandler);
	});
	onCleanup(() => {
		window.removeEventListener('keydown', globalShortcutHandler);
	});
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
