/**
 * @module lib/json
 * @description Provides the type of JSON and JSON schema.
 */

/**
 * JSON value type.
 */
export type JSONValue =
	| null
	| boolean
	| number
	| string
	| JSONArray
	| JSONObject;

/**
 * JSON array type
 */
export type JSONArray = JSONValue[];

/**
 * JSON object type
 */
export interface JSONObject {
	[key: string]: JSONValue;
}

// Schema

/**
 * Schema for a null value.
 */
export type NullSchema = {
	type: 'null';
	description?: string;
};

/**
 * Schema for an enumerated value.
 */
export type EnumSchema = {
	type: 'enum';
	description?: string;
	value: (string | number | boolean | null)[]; // List of possible values.
};

/**
 * Schema for a boolean value.
 */
export type BoolSchema = {
	type: 'boolean';
	description?: string;
};

/**
 * Schema for a number value.
 */
export type NumberSchema = {
	type: 'number';
	description?: string;
	minimum?: number; // Minimum value (inclusive).
	maximum?: number; // Maximum value (inclusive).
	exclusiveMinimum?: number; // Minimum value (exclusive).
	exclusiveMaximum?: number; // Maximum value (exclusive).
	multipleOf?: number; // Value must be a multiple of this number.
};

/**
 * Schema for a string value.
 */
export type StringSchema = {
	type: 'string';
	description?: string;
	minLength?: number; // Minimum length of the string.
	maxLength?: number; // Maximum length of the string.
	pattern?: string; // Regular expression pattern the string must match.
	format?: string; // Specific format (e.g., email, date).
};

/**
 * Schema for an object value.
 */
export type ObjectSchema = {
	type: 'object';
	description?: string;
	properties?: Record<string, JSONSchema>; // Properties of the object.
	required?: string[]; // List of required property names.
};

/**
 * Schema for an array value.
 */
export type ArraySchema = {
	type: 'array';
	description?: string;
	items?: JSONSchema; // Schema for the items in the array.
	prefixItems?: JSONSchema[]; // Schema for the first items in the array.
	minItems?: number; // Minimum number of items in the array.
	maxItems?: number; // Maximum number of items in the array.
};

/**
 * JSON Schema.
 */
export type JSONSchema =
	| NullSchema
	| EnumSchema
	| BoolSchema
	| NumberSchema
	| StringSchema
	| ObjectSchema
	| ArraySchema;

/**
 * Convert JSON Schema to TypeScript.
 */
const jsItemToTS = (item: JSONSchema): string => {
	switch (item.type) {
		case 'enum':
			if (item.value.length === 0) return 'never';
			else if (item.value.length === 1)
				return JSON.stringify(item.value[0]);
			else
				return (
					'(' +
					item.value.map((v) => JSON.stringify(v)).join(' | ') +
					')'
				);
		case 'null':
		case 'boolean':
		case 'number':
		case 'string':
			return item.type;
		case 'array':
			if (item.prefixItems) {
				const prefixes = item.prefixItems.map(jsItemToTS).join(', ');
				if (item.items) {
					return `[${prefixes}, ...${jsItemToTS(item.items)}[]]`;
				} else {
					return `[${prefixes}]`;
				}
			} else {
				if (item.items) {
					return `${jsItemToTS(item.items)}[]`;
				} else {
					return '[]';
				}
			}
		case 'object': {
			if (!item.properties) return '{}';
			const lines = [];
			for (const [key, value] of Object.entries(item.properties)) {
				const desc = value.description
					? `/** ${value.description} */\n`
					: '';
				const required = item.required?.includes(key);
				lines.push(
					`${desc}${key}${required ? '' : '?'}: ${jsItemToTS(value)};`
				);
			}
			return `{\n${lines.join('\n')}\n}`;
		}
	}
};

/**
 * Convert JSON Schema to TS without indentation.
 */
export const jsonSchemaToTS = (
	schema: JSONSchema,
	name: string,
	desc: string
): string => {
	return `/** ${desc.replace(/\n/g, '\n * ')} */\ninterface ${name} ${jsItemToTS(schema)}`;
};
