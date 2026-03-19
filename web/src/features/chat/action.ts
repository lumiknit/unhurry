import { produce } from 'solid-js/store';

import { setChatPageStore } from './store';

export const pushMessage = (
	_threadID: string,
	_message: string
): Promise<void> => {
	throw new Error('Unimplemented');
};

export const openNewThread = (): string => {
	const id = crypto.randomUUID();
	setChatPageStore(
		produce((s) => {
			s.threads[id] = {
				thread: {
					id,
					title: 'New Chat',
					permissions: [],
					sections: [
						{
							id: crypto.randomUUID(),
							label: 'main',
							messages: [],
						},
					],
				},
				isLLMWorking: false,
				streamingMessage: null,
				submittedMessage: null,
			};
			s.activeID = id;
		})
	);
	return id;
};
