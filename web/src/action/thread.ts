import type { UserTextMessage, AITextMessage } from '../lib/thread/types';
import type { ThreadState } from '../state/thread';

/**
 * Send a message to the thread and stream the AI response
 */
export async function sendMessage(
	threadState: ThreadState,
	userMessage: string,
	apiKey: string
) {
	if (!userMessage.trim()) return;

	// Create user message
	const userMsg: UserTextMessage = {
		id: crypto.randomUUID(),
		type: 'user_text',
		text: userMessage,
	};

	// Update thread with user message
	threadState.setThread((prev) => ({
		...prev,
		sections: [
			{
				...prev.sections[0],
				messages: [...(prev.sections[0]?.messages || []), userMsg],
			},
		],
	}));

	// Create AI message placeholder
	const aiMsgId = crypto.randomUUID();
	const aiMsg: AITextMessage = {
		id: aiMsgId,
		type: 'ai_text',
		text: '',
	};

	threadState.setThread((prev) => ({
		...prev,
		sections: [
			{
				...prev.sections[0],
				messages: [...(prev.sections[0]?.messages || []), aiMsg],
			},
		],
	}));

	try {
		const { createOpenAI } = await import('@ai-sdk/openai');
		const openaiProviders = createOpenAI({
			apiKey: apiKey,
		});

		const { streamText } = await import('ai');

		// Get all messages from thread
		const allMessages = threadState
			.thread()
			.sections.flatMap((s) => s.messages);
		const llmMessages = allMessages
			.filter((m) => m.type === 'user_text' || m.type === 'ai_text')
			.map((m) => ({
				role: m.type === 'user_text' ? 'user' : 'assistant',
				content: (m as any).text,
			}));

		const { textStream } = streamText({
			model: openaiProviders('gpt-4o'),
			messages: llmMessages as any,
		});

		// Stream text and update state
		for await (const textDelta of textStream) {
			threadState.setThread((prev) => ({
				...prev,
				sections: [
					{
						...prev.sections[0],
						messages: prev.sections[0].messages.map((m) =>
							m.id === aiMsgId
								? {
										...m,
										text: (m as any).text + textDelta,
									}
								: m
						),
					},
				],
			}));
		}
	} catch (error) {
		console.error('Failed to send message:', error);
		// Update AI message to show error
		threadState.setThread((prev) => ({
			...prev,
			sections: [
				{
					...prev.sections[0],
					messages: prev.sections[0].messages.map((m) =>
						m.id === aiMsgId
							? {
									...m,
									text: `Error: ${(error as any).message}`,
								}
							: m
					),
				},
			],
		}));
	}
}
