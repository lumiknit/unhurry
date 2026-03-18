import { javascriptLanguage } from '@codemirror/lang-javascript';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { type LanguageSupport } from '@codemirror/language';
import { parseMixed } from '@lezer/common';
import { tags as t } from '@lezer/highlight';
import { type MarkdownConfig } from '@lezer/markdown';

console.log('JSDOWN loaded');

export const JSExpressionConfig: MarkdownConfig = {
	defineNodes: [
		{ name: 'JSExpression' },
		{ name: 'JSExprMark', style: t.escape },
	],
	parseInline: [
		{
			name: 'JSExpression',
			parse(cx, next, pos) {
				if (
					next === 36 /* '$' */ &&
					cx.char(pos + 1) === 123 /* '{' */
				) {
					let open = 1;
					for (let i = pos + 2; i < cx.end; i++) {
						if (cx.char(i) === 123) {
							open++;
						} else if (cx.char(i) === 125) {
							open--;
							if (open === 0) {
								return cx.addElement(
									cx.elt('JSExpression', pos, i + 1, [
										cx.elt('JSExprMark', pos, pos + 2),
										cx.elt('JSExprMark', i, i + 1),
									])
								);
							}
						}
					}
				}
				return -1;
			},
			before: 'Emphasis',
		},
	],
	wrap: parseMixed((node) => {
		if (node.name === 'JSExpression') {
			const from = node.from + 2;
			const to = node.to - 1;
			if (from >= to) return null;
			return {
				parser: javascriptLanguage.parser,
				overlay: [{ from, to }],
			};
		}
		return null;
	}),
};

export function jsdown(): LanguageSupport {
	return markdown({
		base: markdownLanguage,
		extensions: [JSExpressionConfig],
	});
}
