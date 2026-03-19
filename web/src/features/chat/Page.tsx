import { Component, createMemo, For, onMount, Show } from 'solid-js';
import { produce } from 'solid-js/store';

import { configStore } from '@/features/settings/store';
import type { Thread, ThreadMessage } from '@/lib/thread/types';

import Message from './components/Message';
import UserInput from './components/UserInput';
import { streamLLMResponse } from './llm';
import { chatPageStore, setChatPageStore } from './store';
import './style.scss';

const newThread = (): Thread => ({
	id: crypto.randomUUID(),
	title: 'New Chat',
	permissions: [],
	sections: [
		{
			id: crypto.randomUUID(),
			label: 'main',
			messages: [],
		},
	],
});

/** Chat page root component */
const Page: Component = () => {
	onMount(() => {
		if (
			!chatPageStore.activeID ||
			!chatPageStore.threads[chatPageStore.activeID]
		) {
			const thread = newThread();
			setChatPageStore(
				produce((s) => {
					s.threads[thread.id] = {
						thread,
						isLLMWorking: false,
						streamingMessage: null,
						submittedMessage: null,
					};
					s.activeID = thread.id;
				})
			);
		}
	});

	const threadStore = createMemo(
		() => chatPageStore.threads[chatPageStore.activeID]
	);

	const messages = createMemo(() => {
		const ts = threadStore();
		if (!ts) return [];
		return ts.thread.sections.flatMap((s) => s.messages);
	});

	const isWorking = () => threadStore()?.isLLMWorking ?? false;

	const handleSubmit = async (text: string): Promise<boolean> => {
		if (!text.trim() || isWorking()) return false;

		const threadId = chatPageStore.activeID;
		const ts = chatPageStore.threads[threadId];
		if (!ts) return false;

		const sectionIdx = ts.thread.sections.length - 1;

		const modelConfig = configStore.models[configStore.currentModelIdx];
		if (!modelConfig) {
			setChatPageStore(
				produce((s) => {
					s.threads[threadId].thread.sections[
						sectionIdx
					].messages.push({
						id: crypto.randomUUID(),
						type: 'system_noti',
						text: 'No model configured. Please add one in Settings.',
					} as ThreadMessage);
				})
			);
			return true;
		}

		const provider = configStore.providers.find(
			(p) => p.id === modelConfig.providerId
		);
		if (!provider) {
			setChatPageStore(
				produce((s) => {
					s.threads[threadId].thread.sections[
						sectionIdx
					].messages.push({
						id: crypto.randomUUID(),
						type: 'system_noti',
						text: 'Provider not found. Please check Settings.',
					} as ThreadMessage);
				})
			);
			return true;
		}

		// Push user message and start working
		setChatPageStore(
			produce((s) => {
				s.threads[threadId].thread.sections[sectionIdx].messages.push({
					id: crypto.randomUUID(),
					type: 'user_text',
					text,
				} as ThreadMessage);
				s.threads[threadId].isLLMWorking = true;
				s.threads[threadId].streamingMessage = '';
			})
		);

		// Snapshot all messages for LLM context after user message is added
		const allMessages = chatPageStore.threads[threadId].thread.sections.flatMap(
			(s) => s.messages
		);

		try {
			const fullText = await streamLLMResponse(
				provider,
				modelConfig,
				allMessages,
				(partial) => {
					setChatPageStore(
						'threads',
						threadId,
						'streamingMessage',
						partial
					);
				}
			);

			setChatPageStore(
				produce((s) => {
					s.threads[threadId].thread.sections[
						sectionIdx
					].messages.push({
						id: crypto.randomUUID(),
						type: 'ai_text',
						text: fullText,
					} as ThreadMessage);
					s.threads[threadId].isLLMWorking = false;
					s.threads[threadId].streamingMessage = null;
				})
			);
		} catch (err) {
			setChatPageStore(
				produce((s) => {
					s.threads[threadId].thread.sections[
						sectionIdx
					].messages.push({
						id: crypto.randomUUID(),
						type: 'system_noti',
						text: `Error: ${err instanceof Error ? err.message : String(err)}`,
					} as ThreadMessage);
					s.threads[threadId].isLLMWorking = false;
					s.threads[threadId].streamingMessage = null;
				})
			);
		}

		return true;
	};

	return (
		<div class="chat-page">
			<div class="message-list">
				<For each={messages()}>
					{(msg) => <Message message={msg} />}
				</For>

				{/* Streaming message (in-progress AI response) */}
				<Show when={isWorking()}>
					<div class="message-item">
						<div class="message-assistant">
							<div class="message-role">Unhurry</div>
							<div class="message-content">
								{threadStore()?.streamingMessage || '...'}
							</div>
						</div>
					</div>
				</Show>
			</div>

			<div class="user-input-area">
				<UserInput onSubmit={handleSubmit} loading={isWorking} />
			</div>
		</div>
	);
};

export default Page;
