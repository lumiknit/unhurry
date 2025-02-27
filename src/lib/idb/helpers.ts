import { SimpleIDB } from './client';

const userConfigIDB = new SimpleIDB('local-user-config', 'configs', 1);
const userConfigKey = 'current';

type UserConfigType = {
	config: string;
	_id: string;
};

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

const chatIDB = new SimpleIDB('local-chat', 'chats', 1);

export const chatTx = async <T>() => {
	return await chatIDB.transaction<T>('readwrite');
};
