/**
 * @module jso
 *
 * JSON Parser, which is very generous, event takes partial JSON.
 *
 * - Basically, all JSON is a valid jso.
 * - If the string is empty, it will considered as null.
 * - Trailing comma, unclosed quotes/parens are allowed.
 * - For string quotes, single quote / backticks are allowed.
 * - Newline can be place in string values.
 * - Triple quotes (or more) are allowed to escape quotes.
 * - You may omit quotes for string or keys. In this case, the trimmed contents will be put.
 */

// Example:
// {test: 42,, '''main"'test''':qwe}

import { JSONArray, JSONObject, JSONValue } from './json';

type ParseResult = [JSONValue | undefined, number];

const specialRE = /[[\]{}'"`,:]/g;
const unescape: Record<string, string | undefined> = {
	b: '\b',
	f: '\f',
	n: '\n',
	r: '\r',
	t: '\t',
};

const parseObject = (s: string, i: number): ParseResult => {
	let j = i;
	const values: JSONObject = {};
	let key: string | undefined;
	while (j < s.length) {
		const [value, nextIndex] = parseAtom(s, j);
		j = nextIndex;
		if (value === undefined) {
			if (s[j - 1] === '}') break;
			if (s[j - 1] === ',') {
				if (key !== undefined) {
					values[key] = null;
					key = undefined;
				}
			}
			if (s[j - 1] === ':') {
				if (key === undefined) {
					key = '';
				}
			}
		} else {
			if (key === undefined) {
				if (typeof value === 'string') {
					key = value;
				} else {
					key = JSON.stringify(value);
				}
			} else {
				values[key] = value;
				key = undefined;
			}
		}
	}
	if (key !== undefined) {
		values[key] = null;
	}
	return [values, j];
};

const parseArray = (s: string, i: number): ParseResult => {
	let j = i;
	const values: JSONArray = [];
	while (j < s.length) {
		const [value, nextIndex] = parseAtom(s, j);
		j = nextIndex;
		if (value === undefined) {
			if (s[j - 1] === ']') break;
		} else {
			values.push(value);
		}
	}
	return [values, j];
};

const parseString = (s: string, i: number): ParseResult => {
	const q = s[i];
	// Find same quotes
	let j = i + 1;
	while (s[j] === q) j++;
	const qs = s.slice(i, j);

	// If quotes is two, just an empty string
	if (qs.length === 2) return ['', j];

	const ss = j;
	while (j < s.length) {
		const n = s.indexOf(qs, j);
		if (n < 0) {
			// Unclosed string, use whole string as a value
			j = s.length;
			break;
		}
		if (s[n - 1] !== '\\') {
			j = n;
			break;
		}
		j = n + 1;
	}
	const t = s.slice(ss, j);
	let v: string = '';

	for (let k = 0; k < t.length; k++) {
		if (t[k] === '\\') {
			k++;
			if (k >= t.length) {
				v += '\\';
				break;
			}
			const z = unescape[t[k]];
			if (z) {
				v += z;
			} else if (t[k] === 'u') {
				const code = parseInt(t.slice(k + 1, k + 5), 16);
				if (code >= 0 && code <= 0xffff) {
					v += String.fromCharCode(code);
					k += 4;
				} else {
					v += '\\u';
				}
			} else {
				v += t[k];
			}
		} else {
			v += t[k];
		}
	}
	return [v, j + qs.length];
};

const parseAtom = (s: string, i: number): ParseResult => {
	specialRE.lastIndex = i;
	const nextSpecial = specialRE.exec(s);
	const len = (nextSpecial ? nextSpecial.index : s.length) - i;
	const value = s.slice(i, i + len).trim();
	if (value) {
		try {
			const v = JSON.parse(value.toLowerCase());
			return [v, i + len];
		} catch {
			// DO NOTHING
		}
		if (value.length > 0) return [value, i + len];
	}
	switch (s[i + len]) {
		case '{':
			return parseObject(s, i + len + 1);
		case '[':
			return parseArray(s, i + len + 1);
		case '"':
		case "'":
		case '`':
			return parseString(s, i + len);
		default:
			return [undefined, i + len + 1];
	}
};

/**
 * Parse jso.
 * @param s input string
 * @returns
 */
export const parseJSO = (s: string): JSONValue => {
	const v = parseAtom(s, 0)[0];
	if (v === undefined) return null;
	return v;
};

/**
 * Parse JSO Call Format:
 * <FUNC_NAME> <ARGS>
 * - FUNC_NAME: Should be a string
 * - ARGS: JSONValue
 * @param s
 * @returns
 */
export const parseJSOCall = (s: string): [string, JSONValue, number] => {
	const res = parseAtom(s, 0);
	const fn = typeof res[0] !== 'string' ? JSON.stringify(res[0]) : res[0];
	const [args] = parseAtom(s, res[1]);
	return [fn, args ?? null, res[1]];
};
