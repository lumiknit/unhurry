import { Component, createEffect, createSignal, For } from 'solid-js';

import {
	easyTextHistory,
	History,
	ILLMService,
	newClientFromConfig,
} from '../lib/llm';
import { getUserConfig } from '../store';

const MainView: Component = () => {
	let client: ILLMService;
	const [history, setHistory] = createSignal<History>(easyTextHistory('You are a helpful assistant'));

	let inputRef: HTMLInputElement;

	createEffect(() => {
		const config = getUserConfig();
		if (!config) return;

		const modelConfig = config.models[config.currentModelIdx];
		if (!modelConfig) return;

		client = newClientFromConfig(modelConfig);
	});

	const handleSend = async () => {
		// Add user message to history
		setHistory(h => [
			...h,
			{
				role: 'user',
				content: inputRef!.value,
			},
		]);

		// Generate response
		const response = await client.chat(history());

		// Add response to history
		setHistory(h => [
			...h,
			response,
		]);
	};

	return (
		<div class="container">
			<For each={history()}>
				{(msg) => (
					<div class={`message`}>
						{msg.role}: {msg.content}
					</div>
				)}
			</For>
			<input
				type="text"
				placeholder="Type your message..."
				ref={inputRef!}
			/>
			<button onClick={handleSend}>Send</button>
		</div>
	);
};

export default MainView;
