/**
 * Display color. Used for the prompt tags.
 */
export type Color =
	| 'none'
	| 'primary'
	| 'info'
	| 'success'
	| 'warning'
	| 'danger';

/**
 * Array of all options for the color.
 */
export const colors = [
	'none',
	'primary',
	'info',
	'success',
	'warning',
	'danger',
] as const;

/**
 * Set of all options for the color.
 */
export const colorSet = new Set(colors);
