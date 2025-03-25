import { Color } from './color';

/**
 * How prompt tag works.
 * - insert: Insert the prompt to the current cursor position.
 * - insert_start: Insert the prompt to the start of the text.
 * - insert_end: Insert the prompt to the end of the text.
 * - replace: Replace the current text with the prompt. $msg will be replaced with the current text.
 */
export type PromptTagAction =
	| 'insert'
	| 'insert-start'
	| 'insert-end'
	| 'replace';

/**
 * Array of all options for the prompt tag actions.
 */
export const promptTagActions = [
	'insert',
	'insert-start',
	'insert-end',
	'replace',
] as const;

/**
 * Show condition for the prompt tag.
 * - always: Always show the tag.
 * - empty: Show the tag when the text is empty.
 * - not_empty: Show the tag when the text is not empty.
 * - prefix: Show the tag when the last word is the same as the parameter.
 */
export type PromptTagShowCondition =
	| 'always'
	| 'empty'
	| 'non-empty'
	| 'prefix';

/**
 * Array of all options for the prompt tag show conditions.
 */
export const promptTagShowConditions = [
	'always',
	'empty',
	'non-empty',
	'prefix',
] as const;

/**
 * Prompt preset tags.
 */
export interface PromptTag {
	/** Label of tag */
	tag: string;

	/**
	 * Color of tag
	 */
	color: Color;

	/**
	 * Show condition
	 */
	showCondition?: PromptTagShowCondition;

	/**
	 * Show condition parameter
	 */
	showConditionParam?: string;

	/**
	 * How the tag works
	 */
	action: PromptTagAction;

	/**
	 * Send the message when tag is clicked.
	 */
	sendImmediately?: boolean;

	/** Values */
	prompt: string;
}

/**
 * Default prompt tags.
 */
export const defaultPromptTag = (): PromptTag => ({
	tag: 'Default',
	color: 'none',
	action: 'insert',
	showCondition: 'always',
	showConditionParam: '',
	sendImmediately: false,
	prompt: 'Hello',
});
