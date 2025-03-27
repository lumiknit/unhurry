import { jsonSchemaToTS, ObjectSchema } from '../json_schema';

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

export const functionToolToTS = (tool: FunctionTool): string => {
	return jsonSchemaToTS(tool.parameters, tool.name, tool.description);
};
