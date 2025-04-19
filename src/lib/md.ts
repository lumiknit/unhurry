/**
 * Convert the given content to markdown code block
 */
export const stringToMDCodeBlock = (tag: string, content: string) => {
	let quotes = '```';

	// Check if the quotes is included in content
	while (content.indexOf(quotes) >= 0) {
		// If quotes found, they should be escape. Increase opener/closer
		quotes += '`';
	}

	// Wrap the content with the quotes
	return `${quotes}${tag}\n${content}\n${quotes}`;
};
