import { autocompletion } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import {
	Compartment,
	EditorState,
	type Extension,
	Prec,
} from '@codemirror/state';
import { EditorView, lineNumbers, keymap, placeholder } from '@codemirror/view';
import { createMediaQuery } from '@solid-primitives/media';
import { createEffect, onCleanup, onMount, splitProps } from 'solid-js';
import type { Component, JSX } from 'solid-js';

import { defaultDark, defaultLight } from './cm_thm_default';
import { cmLangExt } from './lang_ext';

export type FnContainer = {
	getter?: () => string;
	setter?: (text: string) => void;
};

export interface Props extends Omit<
	JSX.HTMLAttributes<HTMLDivElement>,
	'onChange'
> {
	language?: string;
	initText?: string;
	hideLineNumbers?: boolean;
	placeholderText?: string | HTMLElement;

	fn: FnContainer;
	onKeyModEnter?: () => void; // Enter with modifier
	onTextChange?: (text: string) => void;
}

const CodeEdit: Component<Props> = (props) => {
	const [local, rest] = splitProps(props, [
		'language',
		'initText',
		'hideLineNumbers',
		'placeholderText',
		'class',
		'fn',
		'onTextChange',
	]);
	let containerRef!: HTMLDivElement;
	let editorView: EditorView | null = null;

	const updateCompartment = (comp: Compartment) => (ext: Extension) => {
		editorView?.dispatch({
			effects: comp.reconfigure(ext),
		});
	};

	const themeCompartment = new Compartment();
	const updateThemeExt = updateCompartment(themeCompartment);
	const colorSchemeChanges = createMediaQuery('(prefers-color-scheme: dark)');
	const getThemeExt = () =>
		colorSchemeChanges() ? defaultDark : defaultLight;
	createEffect(() => updateThemeExt(getThemeExt()));

	// Create a stable reference to onChange to avoid reconfiguring listeners
	const langCompartment = new Compartment();

	const lineNumbersCompartment = new Compartment();
	const updateLineNumbersExt = updateCompartment(lineNumbersCompartment);
	createEffect(() =>
		updateLineNumbersExt(local.hideLineNumbers ? [] : lineNumbers())
	);

	const placeholderCompartment = new Compartment();
	const updatePlaceholderExt = updateCompartment(placeholderCompartment);
	createEffect(() =>
		updatePlaceholderExt(
			local.placeholderText ? placeholder(local.placeholderText) : []
		)
	);

	const Theme = EditorView.theme({
		'&': {
			fontSize: '1rem',
		},
		'.cm-content': {
			fontFamily: 'var(--cm-monospace)',
		},
		'.cm-scroller': {
			overflow: 'auto',
		},
	});

	onMount(() => {
		// Basic setup extensions needed for a standard editor feel
		const extensions = [
			placeholderCompartment.of(
				local.placeholderText ? placeholder(local.placeholderText) : []
			),
			lineNumbersCompartment.of(
				local.hideLineNumbers ? [] : lineNumbers()
			),
			EditorView.lineWrapping,
			history(),
			autocompletion(),
			keymap.of([...defaultKeymap, ...historyKeymap]),
			EditorView.updateListener.of((update) => {
				if (update.docChanged && local.onTextChange) {
					local.onTextChange(update.state.doc.toString());
				}
			}),
			Prec.highest(
				keymap.of([
					{
						key: 'Alt-Enter',
						run: () => {
							props.onKeyModEnter?.();
							return true;
						},
					},
					{
						key: 'Mod-Enter',
						run: () => {
							props.onKeyModEnter?.();
							return true;
						},
					},
					{
						key: 'Shift-Enter',
						run: () => {
							props.onKeyModEnter?.();
							return true;
						},
					},
					{
						key: 'Ctrl-Enter',
						run: () => {
							props.onKeyModEnter?.();
							return true;
						},
					},
				])
			),
			themeCompartment.of(getThemeExt()),
			langCompartment.of([]),
			Theme,
			EditorView.domEventHandlers({
				drop(event, view) {
					if (!event.dataTransfer?.files.length) return false;

					event.preventDefault();
					const file = event.dataTransfer.files[0];
					const reader = new FileReader();

					reader.onload = (e) => {
						const text = e.target?.result;
						if (typeof text === 'string') {
							const pos = view.posAtCoords({
								x: event.clientX,
								y: event.clientY,
							});
							if (pos !== null) {
								view.dispatch({
									changes: {
										from: pos,
										to: pos,
										insert: text,
									},
									selection: { anchor: pos + text.length },
								});
								view.focus();
							}
						}
					};

					reader.readAsText(file);
					return true;
				},
			}),
		];

		const state = EditorState.create({
			doc: local.initText || '',
			extensions,
		});

		editorView = new EditorView({
			state,
			parent: containerRef,
		});

		local.fn.getter = () => editorView?.state.doc.toString() || '';
		local.fn.setter = (text: string) => {
			if (!editorView) {
				console.warn('EditorView not initialized yet');
				return;
			}
			editorView.dispatch({
				changes: {
					from: 0,
					to: editorView.state.doc.length,
					insert: text,
				},
				selection: { anchor: text.length },
				effects: EditorView.scrollIntoView(text.length),
			});
		};
	});

	// Reactively update language if it changes
	createEffect(async () => {
		if (editorView) {
			const lang = await cmLangExt(local.language || '');
			updateCompartment(langCompartment)(lang);
		}
	});

	onCleanup(() => {
		if (editorView) {
			editorView.destroy();
		}
	});

	return <div ref={containerRef} {...rest} class={local.class} />;
};

export default CodeEdit;
