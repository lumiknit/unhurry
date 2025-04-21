/**
 * Convert the given content to markdown code block
 */
export const stringToMDCodeBlock = (
	tag: string,
	content: string,
	indent: string = ''
) => {
	let quotes = '```';

	// Check if the quotes is included in content
	while (content.indexOf(quotes) >= 0) {
		// If quotes found, they should be escape. Increase opener/closer
		quotes += '`';
	}

	if (indent.length > 0) {
		content = content.replaceAll('\n', `\n${indent}`);
	}

	// Wrap the content with the quotes
	return `${indent}${quotes}${tag}\n${indent}${content}\n${indent}${quotes}`;
};
