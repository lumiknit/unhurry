export interface RunReqMsg {
	type: '>run';
	code: string;
}

export interface IntermediateOutMsg {
	type: '<text-out';
	text: string;
}

export interface RunRespMsg {
	type: '<run';
	output: string;
}

export type Message = RunReqMsg | IntermediateOutMsg | RunRespMsg;
