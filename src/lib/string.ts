export type IndentStyle = {
	s: string;
	tabSize: number;
};

export const guessIndentStyle = (text: string): IndentStyle => {
	let useTab = true;
	let indentSize = 4;

	let p = 0;
	const re = /\s+/y;
	while (p < text.length) {
		const nl = text.indexOf('\n', p);
		// Extract the whites
		re.lastIndex = 0;
		const m = re.exec(text.slice(p, nl));
		if (m) {
			if (m[0] === ' ' && m[0].length > 1) {
				useTab = false;
				indentSize = Math.min(indentSize, m[0].length);
			}
		}
		if (nl < 0) break;
		p = nl + 1;
	}

	console.log(useTab, indentSize);

	return {
		s: useTab ? '\t' : ' '.repeat(indentSize),
		tabSize: useTab ? 4 : indentSize,
	};
};
