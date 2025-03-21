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

export interface FunctionCall {
	id: string;
	name: string;
	args: Record<string, any>;
}

export interface PartialFunctionCall {
	id: string;
	name: string;
	args: string;
}

export const fixFunctionCall = (call: PartialFunctionCall): FunctionCall => {
	return {
		id: call.id,
		name: call.name,
		args: JSON.parse(call.args),
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
