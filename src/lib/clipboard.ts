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
