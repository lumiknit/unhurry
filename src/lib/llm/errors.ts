export class RateLimitError extends Error {
	constructor(body: string) {
		super('429 Too Many Requests: ' + body);
	}
}
