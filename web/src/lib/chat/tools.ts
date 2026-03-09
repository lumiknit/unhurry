export interface FnTool {
	name: string;
	description: string;
}

export const getFnTools = (_opts: Record<string, unknown>): FnTool[] => {
	return [];
};
