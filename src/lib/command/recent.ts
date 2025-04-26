/**
 * @lib/command/recent.ts
 *
 * Recent commands management.
 *
 * The recent commands are managed as a journal in IndexedDB.
 * - _id is related to the timestamp, to be sorted.
 * - Each ids are a used command IDs.
 * - For example, if the DB is [1, 2, 3, 4], [1], [3, 2], [7], then the recent used order is 7, 2, 3, 1, 4.
 */

import { SimpleIDB } from '../idb';

interface RecentCommand {
	/**
	 * DB ID
	 */
	_id: string;

	/**
	 * Command ID
	 */
	ids: string[];
}

const idb = new SimpleIDB('recent-commands', 'commands', 1);
const tx = async () => {
	return await idb.transaction<RecentCommand>('readwrite');
};

const newID = () => {
	return Date.now().toString(36).padStart(12, '0');
};

/**
 * From the records, reduce into the single list of IDs.
 */
const mash = (records: RecentCommand[]): string[] => {
	const mashed: string[] = [];
	const set = new Set<string>();
	for (let i = records.length - 1; i >= 0; i--) {
		const ids = records[i].ids;
		for (const id of ids) {
			if (!set.has(id)) {
				set.add(id);
				mashed.push(id);
			}
		}
	}
	return mashed;
};

/**
 * Read the recent commands from the DB.
 * The return is a list of IDs, the last one is the most recent.
 * Note that this DB will clear the journal and merge them into a single list.
 */
export const load = async () => {
	const db = await tx();
	const records = await db.getAll();
	const mashed = mash(records);

	await db.clear();
	await db.put({ _id: newID(), ids: mashed });

	return mashed;
};

/**
 * Save the command as used.
 */
export const markUsed = async (id: string) => {
	const db = await tx();
	await db.put({ _id: newID(), ids: [id] });
};
