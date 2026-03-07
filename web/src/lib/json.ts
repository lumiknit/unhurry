export type JSONValue =
	| null
	| boolean
	| string
	| number
	| JSONArray
	| JSONObject;

export type JSONArray = JSONValue[];

export type JSONObject = { [key in string]: JSONValue };

// Overwrite JSON.parse type
