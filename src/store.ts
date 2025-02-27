/// Global store

import { createStore, StoreSetter } from 'solid-js/store';

import { sanitizeConfig, UserConfig } from './lib/config';
import { loadUserConfig, saveUserConfig } from './lib/idb';

type GlobalStore = {
	chatState: number;

	userConfig?: UserConfig;
};

export const [store, setStore] = createStore<GlobalStore>({
	chatState: 0,
});

// Load user config
(async () => {
	const c = await loadUserConfig<UserConfig>();
	const userConfig = sanitizeConfig(c);
	setStore('userConfig', userConfig);
})();

export const getUserConfig = () => store.userConfig;
export const setUserConfig = (setter: StoreSetter<UserConfig>) => {
	console.log('Set user config');
	setStore(
		'userConfig',
		setter as StoreSetter<UserConfig | undefined, ['userConfig']>
	);
	// Save to IDB
	saveUserConfig({ ...getUserConfig() });
};
