/**
 * JSON value type
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
