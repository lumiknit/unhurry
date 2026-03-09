export const authenticate = async (_token?: string | null): Promise<void> => {
	// TODO: implement authentication
};

export const getWebsocketEndpoint = (): string => {
	const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
	return `${proto}//${location.host}/ws`;
};
