import { JSONValue } from '@/lib/json';

type Command = {
	id: string;
	description: string;
	handler: (args?: JSONValue) => void;
};

export const commands = new Map<string, Command>();

export const defCommand = (
	id: string,
	description: string,
	handler: (args?: JSONValue) => void
) => {
	commands.set(id, { id, description, handler });
};
