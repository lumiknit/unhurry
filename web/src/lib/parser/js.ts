/**
 * wrapBacktick takes a string which is the 'content' of a backtick string (js template string literal),
 * and returns a new string that is properly escaped and wrapped with backticks.
 * @param input
 * @returns
 */
export const wrapBacktick = (input: string): string => {
	// Context Constants
	const CTX_BASE = 0;
	const CTX_JS = 1;
	const CTX_STR_SINGLE = 2;
	const CTX_STR_DOUBLE = 3;
	const CTX_STR_BACKTICK = 4;
	type Context =
		| typeof CTX_BASE
		| typeof CTX_JS
		| typeof CTX_STR_SINGLE
		| typeof CTX_STR_DOUBLE
		| typeof CTX_STR_BACKTICK;

	let result = '';

	// Context stack
	const stack: Context[] = [CTX_BASE];
	let i = 0;

	while (i < input.length) {
		const char = input[i];
		const nextChar = input[i + 1];
		const currentContext = stack[stack.length - 1];

		// Handle escape
		if (char === '\\') {
			if (currentContext === CTX_BASE) {
				result += '\\\\';
			} else {
				result += char + (nextChar || '');
			}
			i += 2;
			continue;
		}

		// Handle for each context
		switch (currentContext) {
			case CTX_BASE:
				{
					// 가장 바깥쪽 문자열 문맥
					if (char === '`') {
						result += '\\`'; // 백틱 이스케이프
					} else if (char === '$' && nextChar === '{') {
						result += '${';
						stack.push(CTX_JS); // JS 문맥(보간법) 진입
						i++;
					} else {
						result += char;
					}
				}
				break;
			case CTX_JS:
				{
					// ${ } 내부의 JS 식 문맥
					if (char === '}') {
						stack.pop(); // 보간법 종료
						result += '}';
					} else if (char === '{') {
						stack.push(CTX_JS); // JS 내부의 객체 리터럴 등 중첩 중괄호 처리
						result += '{';
					} else if (char === "'") {
						stack.push(CTX_STR_SINGLE);
						result += "'";
					} else if (char === '"') {
						stack.push(CTX_STR_DOUBLE);
						result += '"';
					} else if (char === '`') {
						stack.push(CTX_STR_BACKTICK);
						result += '`';
					} else {
						result += char;
					}
				}
				break;
			case CTX_STR_SINGLE:
				if (char === "'") stack.pop();
				result += char;
				break;
			case CTX_STR_DOUBLE:
				if (char === '"') stack.pop();
				result += char;
				break;
			case CTX_STR_BACKTICK: {
				if (char === '`') {
					stack.pop();
					result += '`';
				} else if (char === '$' && nextChar === '{') {
					result += '${';
					stack.push(CTX_JS);
					i++;
				} else {
					result += char;
				}
			}
		}

		i++;
	}

	return `\`${result}\``;
};
