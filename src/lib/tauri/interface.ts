export type FetchResult = {
	status: number;
	headers: Array<[string, string]>;
	body: string;
};

export interface ITauriService {
	greet(name: string): Promise<string>;
	fetch(
		method: string,
		url: string,
		headers?: Array<[string, string]>,
		body?: string
	): Promise<FetchResult>;
}
