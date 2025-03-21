import { FunctionTool } from './function';
import { LLMMessages, LLMMessage } from './message';

export interface Model {
	id: string;
	object: string;
	ownedBy: string;
	created: number;
}

export interface StreamCallbacks {
	isCancelled?: () => boolean;
	onText?: (text: string) => void;
	onFunctionCall?: (
		index: number,
		id?: string | null,
		name?: string | null,
		args?: string | null
	) => void;
}

/**
 * LLM Service Interface
 */
export interface ILLMService {
	setFunctions(functions: FunctionTool[]): void;

	chat(systemPrompt: string, history: LLMMessages): Promise<LLMMessage>;

	chatStream(
		systemPrompt: string,
		history: LLMMessages,
		callbacks: StreamCallbacks
	): Promise<LLMMessage>;

	listModels(): Promise<Model[]>;
}
