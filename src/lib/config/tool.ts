/**
 * Each tool configurations
 */
export type ToolConfigBase = {
	disabled?: boolean;
};

export type ToolConfigs = Record<string, ToolConfigBase>;

export const getDisabledTools = (tools: ToolConfigs): Set<string> => {
	const disabled = new Set<string>();
	Object.entries(tools).forEach(([name, config]) => {
		if (config.disabled) disabled.add(name);
	});
	return disabled;
};
