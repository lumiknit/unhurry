import { createSignal, Setter } from 'solid-js';

import { sanitizeConfig, UserConfig } from '@/lib/config';
import { loadUserConfig, saveUserConfig } from '@/lib/idb';
import { logr } from '@/lib/logr';
import { emptyMemoryConfig, MemoryConfig } from '@/lib/memory/config';
import { createPersistantSignal } from '@/lib/signal';

/**
 * User Config Helper. This signal is used in the root component, to get the user config.
 */
export const [getUserConfig, setUserConfig_] = createSignal<UserConfig>(
	undefined!,
	{
		equals: false,
	}
);

/**
 * Auto send launch timestamp
 */
export const [autoSendLaunchAt, setAutoSendLaunchAt] = createSignal<
	number | null
>(null, {
	equals: false,
});

// Config

(async () => {
	const c = await loadUserConfig<UserConfig>();
	const userConfig = sanitizeConfig(c);
	setUserConfig_(userConfig);
})();

export const setUserConfig: Setter<UserConfig> = (setter) => {
	logr.info('[store/config] User config updated, will save persistently');
	const v = setUserConfig_(setter);
	saveUserConfig(v);
	return v;
};

export const [getMemoryConfig, setMemoryConfig] =
	createPersistantSignal<MemoryConfig>('memory_cfg', '1', emptyMemoryConfig);
