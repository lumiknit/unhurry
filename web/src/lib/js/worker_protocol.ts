export type MsgBase = {
	id: string;
	type: string;
};

export type CallReqMsg = MsgBase & {
	type: 'req-call';
	code: string;
};

export type CallRetMsg = MsgBase & {
	type: 'ret-call';
	retVal: unknown;
	consoleLines: string[];
	error?: string;
};

export type JSWorkerMsg = CallReqMsg | CallRetMsg;
