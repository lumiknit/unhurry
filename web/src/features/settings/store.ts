import { createEffect } from 'solid-js';
import { createStore, unwrap } from 'solid-js/store';

import { defaultUserConfig, UserConfig } from '../../lib/config';
import { loadUserConfig, saveUserConfig } from '../../lib/db/dbs';

/**
 * getConfigStore and setConfigStore are basic store accessor and updator.
 */
export const [configStore, setConfigStore] =
	createStore<UserConfig>(defaultUserConfig());

createEffect(() => {
	saveUserConfig(configStore);
});

// Load from IDB on startup
loadUserConfig<Partial<UserConfig>>().then((loaded) => {
	if (loaded && Object.keys(loaded).length > 0) {
		setConfigStore(unwrap({ ...defaultUserConfig(), ...loaded }));
	}
});
