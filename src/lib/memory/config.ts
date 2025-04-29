/**
 * Memory Configuration
 */
export type MemoryConfig = {
	/**
	 * True if enabled
	 */
	enabled: boolean;

	/**
	 * Max size limit.
	 * If <= 0, no limit.
	 */
	maxSize: number;

	/**
	 * Contents of the memory.
	 */
	contents: string[];
};

export const emptyMemoryConfig = (): MemoryConfig => ({
	enabled: false,
	maxSize: 128,
	contents: [],
});

/**
 * Apply diff to the memory contents.
 * Diff is a string each line starts with '+' (add) or '-' (delete).
 */
export const applyMemoryDiff = (
	cfg: MemoryConfig,
	diff: string
): MemoryConfig => {
	// Split diff to line by line
	const lines = diff.split('\n');
	const adds: string[] = [];
	const delSet = new Set<string>();
	for (const line of lines) {
		if (line.startsWith('+')) {
			adds.push(line.slice(1).trim());
		} else if (line.startsWith('-')) {
			delSet.add(line.slice(1).trim());
		}
	}

	const newContents = cfg.contents.filter((content) => !delSet.has(content));
	newContents.push(...adds);

	return {
		...cfg,
		contents: newContents,
	};
};
