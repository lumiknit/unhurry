import { createSignal, Setter, Signal } from 'solid-js';

import { SimpleIDB } from './idb';

const psPrefix = '_@per_sig_';

export const createPersistantSignal = <T>(
	name: string,
	version: string,
	initialValue: () => T,
	options?: {
		name?: string;
		equals?:
			| false
			| ((prev: T | undefined, next: T | undefined) => boolean);
	}
): Signal<T | undefined> => {
	const [value, setValue_] = createSignal<T | undefined>(undefined, options);

	const n = psPrefix + name;
	const idb = new SimpleIDB(n, version);

	type Item = {
		_id: string;
		value: T;
	};

	(async () => {
		const tx = await idb.transaction<Item>('readonly');
		const item = await tx.get(n);
		if (item) {
			// @ts-expect-error Ignore
			setValue_(item.value);
		} else {
			// @ts-expect-error Ignore
			setValue_(initialValue());
		}
	})();

	const updateIDB = async (newValue: T | undefined) => {
		const tx = await idb.transaction<Item>('readwrite');
		if (newValue === undefined) {
			await tx.clear();
		} else {
			await tx.put({ _id: n, value: newValue });
		}
	};

	// @ts-expect-error Ignore
	const setValue: Setter<T | undefined> = (s) => {
		// @ts-expect-error Ignore
		const nv = setValue_(s);
		updateIDB(nv);
		return nv;
	};

	return [value, setValue];
};
