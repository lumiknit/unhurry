/**
 * Read SSE request's body as JSON
 */
export const readSSEJSONStream = async <T>(
	reader: ReadableStreamDefaultReader<Uint8Array>,
	onData: (data: T) => void | Promise<void>
): Promise<void> => {
	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
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
			if (!part.startsWith('data: ')) continue;
			const data = part.slice('data: '.length);
			if (data === "DONE" || data === "[DONE]") break;
			try {
				const chunk = JSON.parse(data) as T;
				await onData(chunk);
			} catch (e) {
				console.warn('Failed to parse chunk', e);
			}
		}
	}
	reader.releaseLock();
};
