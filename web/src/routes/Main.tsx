import { useNavigate } from '@solidjs/router';
import { Component, createSignal, For, onMount } from 'solid-js';
import { Toaster, toast } from 'solid-toast';

import CodeEdit, { FnContainer } from '../components/code/CodeEdit';
import { loadUserConfig } from '../lib/db/dbs';
import './Main.scss';

interface Message {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
}

const Main: Component = () => {
	const navigate = useNavigate();
	const [input, setInput] = createSignal('');
	const [messages, setMessages] = createSignal<Message[]>([]);
	const [apiKey, setApiKey] = createSignal('');

	onMount(async () => {
		const config = await loadUserConfig<{ openaiApiKey?: string }>();
		if (config.openaiApiKey) {
			setApiKey(config.openaiApiKey);
		}
	});

	const codeEditFn: FnContainer = {};

	const handleSubmit = async () => {
		const text = input().trim();
		if (!text) return;

		const key = apiKey();
		if (!key) {
			navigate('/settings');
			return;
		}

		// Add user message
		const userMsg: Message = {
			id: crypto.randomUUID(),
			role: 'user',
			content: text,
		};
		setMessages((prev) => [...prev, userMsg]);
		setInput('');

		const assistantMsgId = crypto.randomUUID();
		setMessages((prev) => [
			...prev,
			{ id: assistantMsgId, role: 'assistant', content: '' },
		]);

		try {
			// Instead of custom client, we use Vercel AI SDK
			// Create a generic OpenAI-compatible provider (as the user used OpenAI endpoint previously)
			const { createOpenAI } = await import('@ai-sdk/openai');
			const openaiProviders = createOpenAI({
				apiKey: key,
			});

			const { streamText } = await import('ai');

			const llmMessages = messages().map((m) => ({
				role: m.role,
				content: m.content,
			}));

			const { textStream } = streamText({
				model: openaiProviders('gpt-4o'), // or the assigned model
				messages: llmMessages as any, // CoreMessages
			});

			for await (const textDelta of textStream) {
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantMsgId
							? { ...m, content: m.content + textDelta }
							: m
					)
				);
			}
		} catch (e: any) {
			toast.error(`Request failed: ${e.message}`);
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

				{/* Flat Message List */}
				<div class="message-list">
					<For each={messages()}>
						{(msg) => (
							<div
								class={`message-item ${msg.role === 'user' ? 'message-item-user' : 'message-item-assistant'}`}
							>
								{msg.role === 'assistant' && (
									<div class="message-assistant-name">
										Unhurry
									</div>
								)}
								{msg.content}
							</div>
						)}
					</For>
				</div>
			</div>

			{/* Typora-like Input Area */}
			<div class="main-container">
				<CodeEdit
					fn={codeEditFn}
					initText={input()}
					onTextChange={setInput}
					placeholderText={'asd'}
					onKeyModEnter={() => {
						handleSubmit();
						codeEditFn.setter?.('');
					}}
					class="code-edit-input"
				/>
			</div>
		</div>
	);
};

export default Main;
