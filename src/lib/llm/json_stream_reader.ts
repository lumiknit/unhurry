type SSEDataHandler<T> = (data: T, event: string) => void | Promise<void>;

/**
 * Read SSE request's body as JSON
 */
export const readSSEJSONStream = async <T>(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	onData: SSEDataHandler<T>
): Promise<void> => {
	const decoder = new TextDecoder();

	let event = '';
	let buffer = '';
	let running = true;

	while (running) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		if (!value) {
			continue;
		}

		buffer += decoder.decode(value, { stream: true });
		const parts = buffer.split('\n');
		buffer = parts.pop() || '';

		for (const part of parts) {
			const colon = part.indexOf(':');
			if (colon < 0) continue;
			const field = part.slice(0, colon);
			const data = part.slice(colon + 1).trim();
			switch (field) {
				case 'event':
					event = data;
					break;
				case 'data':
					if (data === 'DONE' || data === '[DONE]') {
						running = false;
						break;
					}
					try {
						const chunk = JSON.parse(data) as T;
						await onData(chunk, event);
					} catch (e) {
						console.warn('Failed to parse chunk', e);
					}
					break;
				default:
					console.warn('Unknown field', field);
			}
		}
	}

	reader.releaseLock();
};
