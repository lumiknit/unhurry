/**
 * Copies the provided text content to the clipboard.
 *
 * This function uses the modern `navigator.clipboard` API if available.
 * If the API is not supported (e.g., in older browsers), it falls back
 * to creating a temporary `<textarea>` element to copy the text.
 *
 * @param content - The text content to be copied to the clipboard.
 * @returns A promise that resolves when the text has been successfully copied.
 */
export const copyToClipboard = async (content: string) => {
	if (navigator.clipboard) {
		navigator.clipboard.writeText(content);
	} else {
		// Fallback for older browsers
		const el = document.createElement('textarea');
		el.value = content;
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
	}
};
