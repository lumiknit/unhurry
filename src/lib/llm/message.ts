export type Role = 'system' | 'user' | 'assistant';

export interface TextMessage {
	role: Role;
	content: string;
}

export type Message = TextMessage;

export type History = Message[];

/**
 * Create a history in order of system, user, assistant, user, assistant, ...
 */
export const easyTextHistory = (
	systemPrompt: string,
	...messages: string[]
): History => {
	const history: History = [
		{
			role: 'system',
			content: systemPrompt,
		},
	];

	for (let i = 0; i < messages.length; i++) {
		history.push({
			role: i % 2 === 0 ? 'user' : 'assistant',
			content: messages[i],
		});
	}

	return history;
};
