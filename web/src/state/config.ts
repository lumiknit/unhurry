import { createSignal } from 'solid-js';

import { defaultUserConfig, UserConfig } from '../lib/config';
import { loadUserConfig, saveUserConfig } from '../lib/db/dbs';

export const [getConfig, setConfig_] =
	createSignal<UserConfig>(defaultUserConfig());

export const setConfig = (
	updater: UserConfig | ((prev: UserConfig) => UserConfig)
) => {
	setConfig_(updater as UserConfig);
	saveUserConfig(getConfig());
};

// Aliases for ported components
export const getUserConfig = getConfig;

export const setUserConfig = (
	updater: UserConfig | ((prev: UserConfig) => UserConfig)
) => setConfig(updater);

// Load from IDB on startup
loadUserConfig<Partial<UserConfig>>().then((loaded) => {
	if (loaded && Object.keys(loaded).length > 0) {
		setConfig_({ ...defaultUserConfig(), ...loaded });
	}
});
