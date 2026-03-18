export interface BEClient {
	// File-system related

	// Network related
	httpRequest(
		method: string,
		url: string,
		options?: {
			headers?: Record<string, string>;
			body?: string;
		}
	): Promise<{
		status: number;
		headers: Record<string, string>;
		body: string;
	}>;
}
