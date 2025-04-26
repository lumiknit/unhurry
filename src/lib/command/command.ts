import { logr } from '../logr';
import { load, markUsed } from './recent';
import { Command, CommandArgs, keyEventToShortcut, Shortcut } from './structs';

/**
 * Command registration and handling
 */
const rawCommands: Map<string, Command> = new Map();

/**
 * Registered shortcuts
 */
const shortcuts: Map<string, Shortcut> = new Map();

/**
 * Register a command
 */
export const registerCommand = (command: Command) => {
	rawCommands.set(command.id, {
		...command,
		q: command.id.toLowerCase() + ' ' + command.name.toLowerCase(),
	});
};

/**
 * Register a shortcut
 */
export const registerShortcut = (shortcut: Shortcut) => {
	shortcuts.set(shortcut.key, shortcut);
};

export const getCommand = (id: string) => {
	return rawCommands.get(id);
};

/**
 * Test if the command name contains the query
 * This function is a fuzzy search (case insensitive, non-exact) */
export const queryCmdName = (haystack: string, query: string) => {
	let i = 0;
	let j = 0;
	while (i < haystack.length && j < query.length) {
		if (haystack[i] === query[j]) {
			i++;
			j++;
		} else {
			i++;
		}
	}
	return j >= query.length;
};

/**
 * Execute a command by id
 */
export const runCommand = (id: string, args?: CommandArgs) => {
	const cmd = rawCommands.get(id);
	if (cmd) {
		cmd.action(args);
	}
};

/**
 * Handle key events for shortcuts
 */
export const handleKey = (e: KeyboardEvent) => {
	const s = shortcuts.get(keyEventToShortcut(e));
	if (s) {
		const cmd = rawCommands.get(s.id);
		if (cmd) {
			e.preventDefault();
			e.stopPropagation();
			cmd.action(s.args);
		}
	}
};

// Commands for palette

export let commandIDs: string[] = [];

export const bringCommandUp = (id: string) => {
	markUsed(id);
	const idx = commandIDs.indexOf(id);
	if (idx >= 0) {
		commandIDs.splice(idx, 1);
		commandIDs.unshift(id);
	}
};

export const buildCommands = async () => {
	shortcuts.forEach((s) => {
		if (s.args) return;
		const cmd = rawCommands.get(s.id);
		if (cmd) {
			cmd.shortcut = s.key;
		}
	});

	const cmds: string[] = [];
	const idSet = new Set<string>();

	// Load recent commands, and push first
	try {
		const ids = await load();
		for (const id of ids) {
			const cmd = rawCommands.get(id);
			if (cmd) {
				cmds.push(cmd.id);
				idSet.add(id);
			}
		}
	} catch (e) {
		logr.warn('Error loading recent commands', e);
	}

	for (const cmd of rawCommands.values()) {
		if (!idSet.has(cmd.id)) {
			cmds.push(cmd.id);
		}
	}

	commandIDs = cmds;
};

export const filterCommands = (query: string) => {
	const q = query.trim().toLowerCase();
	const filtered: Command[] = [];
	for (let i = 0; i < commandIDs.length; i++) {
		const cmd = rawCommands.get(commandIDs[i]);
		if (!cmd || !queryCmdName(cmd.q!, q)) continue;
		filtered.push(cmd);
	}
	return filtered;
};
