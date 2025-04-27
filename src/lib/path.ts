/**
 * @module lib/path
 * Path helper functions
 */

// Regular expressions for path processing
const PATH_SEPARATOR_REGEX = /[/\\]+/; // Matches both '/' and '\'
const PROTOCOL_REGEX = /^([a-zA-Z]+):\/\//; // Matches protocol in a URL

/**
 * Extracts the file name from a given path.
 */
export const getFileName = (path: string): string => {
	const parts = path.split(PATH_SEPARATOR_REGEX);
	return parts[parts.length - 1] || '';
};

/**
 * Extracts the file extension from a given path.
 * If not extension is found, returns the whole file name (e.g. Makefile, Dockerfile, etc.)
 */
export const getFileExtension = (path: string): string => {
	const fileName = getFileName(path);
	const dotIndex = fileName.lastIndexOf('.');
	return fileName.slice(dotIndex + 1);
};

/**
 * Extracts the protocol from a given path.
 * If no protocol exists, defaults to 'file'.
 */
export const getProtocol = (path: string): string => {
	const match = path.match(PROTOCOL_REGEX);
	return match ? match[1] : 'file';
};
