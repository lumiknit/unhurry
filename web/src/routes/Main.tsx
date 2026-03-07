import { useNavigate } from '@solidjs/router';
import { Component, createSignal, For, onMount } from 'solid-js';
import { Toaster, toast } from 'solid-toast';

import { sendMessage } from '../action/thread';
import { FnContainer } from '../components/code/CodeEdit';
import Message from '../components/r-main/Message';
import UserInput from '../components/r-main/UserInput';
import { loadUserConfig } from '../lib/db/dbs';
import { ThreadState } from '../state/thread';
import './Main.scss';

const Main: Component = () => {
	const navigate = useNavigate();
	const [input, setInput] = createSignal('');
	const [loading, setLoading] = createSignal(false);
	const [apiKey, setApiKey] = createSignal('');
	const [threadState] = createSignal(new ThreadState());

	onMount(async () => {
		const config = await loadUserConfig<{ openaiApiKey?: string }>();
		if (config.openaiApiKey) {
			setApiKey(config.openaiApiKey);
		}
	});

	const codeEditFn: FnContainer = {};

	const handleSubmit = async () => {
		const text = input().trim();
		if (!text || loading()) return;

		const key = apiKey();
		if (!key) {
			navigate('/settings');
			return;
		}

		setLoading(true);
		try {
			await sendMessage(threadState(), text, key);
			setInput('');
			codeEditFn.setter?.('');
		} catch (e: any) {
			toast.error(`Request failed: ${e.message}`);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div class="main-page">
			<Toaster position="top-center" />

			<div class="message-container">
				{/* Top Logo / Settings trigger */}
				<div
					class="settings-trigger"
					onClick={() => navigate('/settings')}
				>
					⚙️ Config
				</div>

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
				<UserInput
					value={input}
					onTextChange={setInput}
					onSubmit={handleSubmit}
					fn={codeEditFn}
					loading={loading}
				/>
			</div>
		</div>
	);
};

export default Main;
