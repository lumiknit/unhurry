import { SimpleIDB } from './client';

const userConfigIDB = new SimpleIDB('local-user-config', 'configs', 1);
const userConfigKey = 'current';

// User Config

interface UserConfigType {
	config: string;
	_id: string;
}

export const userConfigTx = async () => {
	return await userConfigIDB.transaction<UserConfigType>('readwrite');
};

export const saveUserConfig = async <T>(config: T) => {
	const tx = await userConfigTx();
	await tx.put({
		config: JSON.stringify(config),
		_id: userConfigKey,
	});
};

export const loadUserConfig = async <T>() => {
	const tx = await userConfigTx();
	try {
		const c = await tx.get(userConfigKey);
		return JSON.parse(c.config) as T;
	} catch {
		return {} as T;
	}
};

// Chat list

const chatListIDB = new SimpleIDB('chat-list', 'chats', 1);

export const chatListTx = async <T>() => {
	return await chatListIDB.transaction<T>('readwrite');
};

const chatIDB = (id: string) => new SimpleIDB('chat:' + id, 'messages', 1);

export const chatTx = async <T>(id: string) => {
	return await chatIDB(id).transaction<T>('readwrite');
};

export const clearAllChats = async (options?: { left?: number }) => {
	if ((options?.left || 0) <= 0) {
		const tx = await chatListTx();
		tx.clear();

		const dbList = await indexedDB.databases();
		for (const db of dbList) {
			if (!db.name) continue;
			if (db.name.startsWith('chat:')) {
				indexedDB.deleteDatabase(db.name);
			}
		}
	} else {
		// Keep n latest chats
		const n = options!.left!;
		type T = {
			_id: string;
			lastUsedAt?: number;
		};
		const tx = await chatListTx<T>();
		const all = await tx.getAll();
		const sorted = all.sort(
			(a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0)
		);
		const toDelete = sorted.slice(n);
		for (const chat of toDelete) {
			await deleteChatByID(chat._id);
		}
	}
};

export const deleteChatByID = async (id: string) => {
	const tx = await chatListTx();
	await tx.delete(id);

	indexedDB.deleteDatabase('chat:' + id);
};

// Tasks

const taskListIDB = new SimpleIDB('task-list', 'tasks', 1);

export const taskListTx = async <T>() => {
	return await taskListIDB.transaction<T>('readwrite');
};
