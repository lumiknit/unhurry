import { keyEventToShortcut } from './shortcut';

export type CommandArgs = string[];

export type Command = {
	id: string;
	name: string;
	shortcut?: string;
	action: (args?: CommandArgs) => void;

	q?: string;
};

export type Shortcut = {
	key: string;
	id: string;
	args?: CommandArgs;
};

const rawCommands: Map<string, Command> = new Map();
const shortcuts: Map<string, Shortcut> = new Map();

export const registerCommand = (command: Command) => {
	rawCommands.set(command.id, {
		...command,
		q: command.id.toLowerCase() + ' ' + command.name.toLowerCase(),
	});
};

export const cmdHasName = (haystack: string, query: string) => {
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

export const registerShortcut = (shortcut: Shortcut) => {
	shortcuts.set(shortcut.key, shortcut);
};

export const handleKey = (e: KeyboardEvent) => {
	const s = shortcuts.get(keyEventToShortcut(e));
	console.log(s);
	if (s) {
		const cmd = rawCommands.get(s.id);
		if (cmd) {
			e.preventDefault();
			e.stopPropagation();
			cmd.action(s.args);
		}
	}
};

export let commands: Command[] = [];

export const buildCommands = () => {
	shortcuts.forEach((s) => {
		if (s.args) return;
		const cmd = rawCommands.get(s.id);
		if (cmd) {
			cmd.shortcut = s.key;
		}
	});

	commands = Array.from(rawCommands.values());
};

export const filterCommands = (query: string) => {
	const q = query.trim().toLowerCase();
	return commands.filter((cmd) => cmdHasName(cmd.q!, q));
};

export const runCommand = (id: string, args?: CommandArgs) => {
	const cmd = rawCommands.get(id);
	if (cmd) {
		cmd.action(args);
	}
};
