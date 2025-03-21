/**
 * Function tool.
 */
export interface FunctionTool {
	/**
	 * Function name.
	 */
	name: string;

	/**
	 * Function descrition.
	 */
	description: string;

	/**
	 * Input JSON schema.
	 */
	parameters: ObjectSchema;
}

export interface PartialFunctionCall {
	id: string;
	name: string;
	args: string;
}

/**
 * Append a partial function call to a function call.
 * It may be useful for streamed function call.
 */
export const appendPartialFunctionCall = (
	fc: undefined | PartialFunctionCall,
	v: PartialFunctionCall
): PartialFunctionCall => {
	if (fc === undefined) return v;
	return {
		id: fc.id + v.id,
		name: fc.name + v.name,
		args: fc.args + v.args,
	};
};

export type BoolSchema = {
	type: 'boolean';
	description?: string;
};

export type NumberSchema = {
	type: 'number';
	description?: string;
	minimum?: number;
	maximum?: number;
	exclusiveMinimum?: number;
	exclusiveMaximum?: number;
	multipleOf?: number;
};

export type StringSchema = {
	type: 'string';
	description?: string;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	format?: string;
};

export type ObjectSchema = {
	type: 'object';
	description?: string;
	properties?: Record<string, JSONSchema>;
	required?: string[];
};

export type ArraySchema = {
	type: 'array';
	description?: string;
	items?: JSONSchema;
	prefixItems?: JSONSchema[];
	minItems?: number;
	maxItems?: number;
};

export type JSONSchema =
	| BoolSchema
	| NumberSchema
	| StringSchema
	| ObjectSchema
	| ArraySchema;
