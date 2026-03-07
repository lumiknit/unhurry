import { tags as t } from '@lezer/highlight';
import { createTheme } from 'thememirror';

// Github Theme based color theme

const commonStyles = [
	{
		tag: t.strong,
		fontWeight: 'bold',
	},
	{
		tag: t.emphasis,
		fontStyle: 'italic',
	},
	{
		tag: t.link,
		textDecoration: 'underline',
	},
	{
		tag: t.heading,
		fontWeight: 'bold',
		textDecoration: 'underline',
	},
	{
		tag: t.strikethrough,
		textDecoration: 'line-through',
	},
];

const lightPalette = {
	invalid: '#d1242f',
	comment: '#329033',
	docComment: '#448c27',
	literal: '#0550ae',
	string: '#1d4a8c',
	keyword: '#cf222e',
	type: '#c76618',
	func: '#8250df',
	var: '#953800',
	tag: '#116329',
	link: '#0550ae',
};

const darkPalette = {
	invalid: '#f85149',
	comment: '#9198a1',
	docComment: '#9198a1',
	literal: '#79c0ff',
	string: '#a5d6ff',
	keyword: '#ff7b72',
	type: '#ffa657',
	func: '#d2a8ff',
	var: '#ffa657',
	tag: '#7ee787',
	link: '#79c0ff',
};

const styles = (pallete: Record<string, string>) => [
	...commonStyles,
	{
		tag: t.invalid,
		color: pallete.invalid,
	},
	{
		tag: [t.comment, t.lineComment, t.blockComment],
		fontStyle: 'italic',
		color: pallete.comment,
	},
	{
		tag: [t.docComment, t.docString, t.documentMeta],
		fontStyle: 'italic',
		color: pallete.docComment,
	},
	{
		tag: [t.null, t.bool, t.atom, t.special(t.variableName)],
		fontStyle: 'italic',
		color: pallete.literal,
	},
	{
		tag: [t.literal, t.integer, t.float, t.number],
		color: pallete.literal,
	},
	{
		tag: [
			t.character,
			t.string,
			t.regexp,
			t.special(t.string),
			t.special(t.regexp),
		],
		color: pallete.string,
	},
	{
		tag: [t.escape],
		fontWeight: 'bold',
		color: pallete.string,
	},
	{
		tag: [
			t.keyword,
			t.controlKeyword,
			t.moduleKeyword,
			t.definitionKeyword,
		],
		fontWeight: 'bold',
		color: pallete.keyword,
	},
	{
		tag: [t.typeName, t.className],
		fontWeight: 'bold',
		color: pallete.type,
	},
	{
		tag: [t.function(t.variableName), t.function(t.propertyName)],
		color: pallete.func,
	},
	{
		tag: [t.definition(t.variableName), t.propertyName, t.attributeName],
		color: pallete.var,
	},
	{
		tag: [t.macroName, t.meta],
		fontWeight: 'bold',
		color: pallete.func,
	},
	{
		tag: [t.namespace],
		fontWeight: 'bold',
		color: pallete.type,
	},
	{
		tag: [t.tagName],
		fontWeight: 'bold',
		color: pallete.tag,
	},
	{
		tag: [t.labelName],
		fontWeight: 'bold',
		fontStyle: 'italic',
		color: pallete.literal,
	},
	// Markdown
	{
		tag: [t.quote],
		color: pallete.literal,
	},
	{
		tag: [t.link],
		textDecoration: 'underline',
		color: pallete.link,
	},
];

export const defaultLight = createTheme({
	variant: 'light',
	settings: {
		background: '#ffffff00',
		foreground: '#1f2328',
		caret: '#0969da',
		selection: '#006edb80',
		gutterBackground: '#ffffff00',
		gutterForeground: '#737c86ff',
		lineHighlight: '#70809018',
	},
	styles: styles(lightPalette),
});

export const defaultDark = createTheme({
	variant: 'dark',
	settings: {
		background: '#00000000',
		foreground: '#f0f6fc',
		caret: '#45a6ff',
		selection: '#0576ff80',
		gutterBackground: '#00000000',
		gutterForeground: '#75797cff',
		lineHighlight: '#70809060',
	},
	styles: styles(darkPalette),
});
