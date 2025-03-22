export class BadRequestError extends Error {
	constructor(body: string) {
		super('400 Bad Request: ' + body);
	}
}

export class RequestEntityTooLargeError extends Error {
	constructor(body: string) {
		super('413 Request Entity Too Large: ' + body);
	}
}

export class RateLimitError extends Error {
	constructor(body: string) {
		super('429 Too Many Requests: ' + body);
	}
}
