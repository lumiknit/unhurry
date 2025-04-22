import { FunctionTool } from './function';
import { LLMMessages, LLMMessage } from './message';

/**
 * Model information.
 */
export interface Model {
	/**
	 * Model identifier.
	 */
	id: string;

	/**
	 * Model type.
	 */
	object: string;

	/**
	 * Model name.
	 */
	ownedBy: string;

	/**
	 * Create timestamp.
	 */
	created: number;
}

/**
 * Streaming callbacks. (Event listener)
 */
export interface StreamCallbacks {
	/**
	 * Return true iff the chat streaming is cancelled.
	 */
	isCancelled?: () => boolean;

	/**
	 * Called when the LLM starts streaming without error.
	 */
	onStart?: () => void;

	/**
	 * Called when the LLM sends a chunk of text.
	 */
	onText?: (text: string) => void;

	/**
	 * Called when the LLM sends a function call.
	 */
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
	/**
	 * Set function tools
	 */
	setFunctions(functions: FunctionTool[]): void;

	/**
	 * Chat with the LLM.
	 * The result message will be returned at once.
	 */
	chat(systemPrompt: string, history: LLMMessages): Promise<LLMMessage>;

	/**
	 * Chat with the LLM.
	 * The result messages will be streamed.
	 */
	chatStream(
		systemPrompt: string,
		history: LLMMessages,
		callbacks: StreamCallbacks
	): Promise<LLMMessage>;

	/**
	 * List available models.
	 */
	listModels(): Promise<Model[]>;
}
