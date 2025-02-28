export type RunReqMsg = {
	type: '>run';
	code: string;
};

export type IntermediateOutMsg = {
	type: '<text-out';
	text: string;
};

export type RunRespMsg = {
	type: '<run';
	output: string;
};

export type Message = RunReqMsg | IntermediateOutMsg | RunRespMsg;
