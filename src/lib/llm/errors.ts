/**
 * Recoverable error, which can be retried.
 */
export const llmErrorRecoverable = 0;

/**
 * Maybe recoverable error, which can be retry, but not so much.
 */
export const llmErrorMaybeRecoverable = 1;

/**
 * Not recoverable error, which should not be retried.
 */
export const llmErrorFatal = 2;

export type LLMErrorLevel = 0 | 1 | 2;

export const isLLMErrorToRetry = (...errs: LLMError[]): boolean => {
	const level = Math.max(...errs.map((e) => e.level));
	return level <= llmErrorMaybeRecoverable;
};

export class LLMError extends Error {
	level: LLMErrorLevel = 2;
}

export class BadRequestError extends LLMError {
	constructor(body: string) {
		super('400 Bad Request: ' + body);
		this.level = llmErrorFatal;
	}
}

export class RequestEntityTooLargeError extends LLMError {
	constructor(body: string) {
		super('413 Request Entity Too Large: ' + body);
		this.level = llmErrorFatal;
	}
}

export class RateLimitError extends LLMError {
	constructor(body: string) {
		super('429 Too Many Requests: ' + body);
		this.level = llmErrorMaybeRecoverable;
	}
}
