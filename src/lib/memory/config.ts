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
	const memSet = new Set<string>(cfg.contents);
	for (const line of diff.split('\n')) {
		if (line.startsWith('+')) {
			memSet.add(line.slice(1).trim());
		} else if (line.startsWith('-')) {
			memSet.delete(line.slice(1).trim());
		}
	}

	let contents = Array.from(memSet.values());
	if (cfg.maxSize > 0) {
		contents = contents.slice(0, cfg.maxSize);
	}

	return {
		...cfg,
		contents,
	};
};
