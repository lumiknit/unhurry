/// Global store

import { createStore, StoreSetter, unwrap } from 'solid-js/store';
import toast from 'solid-toast';

import { ChatContext, emptyChatContext } from '../lib/chat';
import { sanitizeConfig, UserConfig } from '../lib/config';
import { loadUserConfig, saveUserConfig } from '../lib/idb';

type GlobalStore = {
	chatContext: ChatContext;
	streamingMessage?: string;

	userConfig?: UserConfig;
};

export const [store, setStore] = createStore<GlobalStore>({
	chatContext: emptyChatContext(),
});

// Load user config
(async () => {
	const c = await loadUserConfig<UserConfig>();
	const userConfig = sanitizeConfig(c);
	setStore('userConfig', userConfig);
})();

export const getUserConfig = () => store.userConfig;
export const setUserConfig = (setter: StoreSetter<UserConfig>) => {
	toast('Config updated', {
		duration: 500,
	});
	console.log('Set user config');
	setStore(
		'userConfig',
		setter as StoreSetter<UserConfig | undefined, ['userConfig']>
	);
	// Save to IDB
	saveUserConfig(unwrap(getUserConfig()));
};

export const getChatContext = () => store.chatContext;
export const setChatContext = (setter: StoreSetter<ChatContext>) => {
	setStore(
		'chatContext',
		setter as StoreSetter<ChatContext, ['chatContext']>
	);
};

export const getStreamingMessage = () => store.streamingMessage;
export const setStreamingMessage = (
	setter: StoreSetter<string | undefined>
) => {
	setStore(
		'streamingMessage',
		setter as StoreSetter<string | undefined, ['streamingMessage']>
	);
};
