export type FetchResult = {
	status: number;
	headers: Array<[string, string]>;
	body: string;
};

/**
 * Backend service interface.
 * It'll help some actions which are not possible in the browser.
 */
export interface IBEService {
	/**
	 * Backend service name.
	 */
	name(): string;

	/**
	 * Test method.
	 */
	greet(name: string): Promise<string>;

	/**
	 * Fetch a URL.
	 */
	fetch(
		method: string,
		url: string,
		headers?: Array<[string, string]>,
		body?: string
	): Promise<FetchResult>;
}
