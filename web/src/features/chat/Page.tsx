import { Component, createSignal, For, onMount } from 'solid-js';

import Message from '../../components/r-chat/Message';
import UserInput from '../../components/r-chat/UserInput';
import { loadUserConfig } from '../../lib/db/dbs';
import './styles.scss';

/** Chat page root component */
const Page: Component = () => {
	const [apiKey, setApiKey] = createSignal('');
	const [loading, setLoading] = createSignal(false);

	onMount(async () => {
		const config = await loadUserConfig<{ openaiApiKey?: string }>();
		if (config.openaiApiKey) {
			setApiKey(config.openaiApiKey);
		}
	});

	const handleSubmit = async (text: string): boolean => {
		console.log('A', text);
		return true;
	};

	return (
		<div class="container">
			<div class="message-container">
				{/* Message List */}
				<div class="message-list">
					<For
						each={threadState()
							.thread()
							.sections.flatMap((s) => s.messages)}
					>
						{(msg) => <Message message={msg} />}
					</For>
				</div>
			</div>

			{/* Typora-like Input Area */}
			<div class="main-container">
				<UserInput onSubmit={handleSubmit} loading={loading} />
			</div>
		</div>
	);
};

export default Page;
