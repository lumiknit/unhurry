import { makePersisted } from '@solid-primitives/storage';
import localforage from 'localforage';
import { createStore } from 'solid-js/store';

import { defaultUserConfig, UserConfig } from '../../lib/config';

const configStorage = localforage.createInstance({
	name: '-unhurry',
	storeName: 'store-config',
	description: 'For solid store of user config',
});

/**
 * getConfigStore and setConfigStore are basic store accessor and updator.
 */
export const [configStore, setConfigStore] = makePersisted(
	createStore<UserConfig>(defaultUserConfig()),
	{
		storage: configStorage,
	}
);
