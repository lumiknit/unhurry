// Shortcut symbols

import { Component } from 'solid-js';

export const symAlt = '⌥';
export const symShift = '⇧';
export const symMeta = '⌘';
export const symCtrl = '⌃';

/**
 * Extract the shortcut format from a key event.
 * @returns {string} The shortcut string. e.g. "⌥⇧⌘a"
 */
export const keyEventToShortcut = (event: KeyboardEvent): string => {
	let key = event.key;
	if (event.metaKey || event.ctrlKey) key = symMeta + key;
	if (event.shiftKey) key = symShift + key;
	if (event.altKey) key = symAlt + key;
	return key;
};

// Command structure

/**
 * Arguments for a command.
 */
export type CommandArgs = string[];

/**
 * Command structure.
 */
export type Command = {
	id: string;
	name: string;
	icon?: Component;
	shortcut?: string;
	action: (args?: CommandArgs) => void;

	q?: string;
};

/**
 * Shortcut structure.
 */
export type Shortcut = {
	key: string;
	id: string;
	args?: CommandArgs;
};
