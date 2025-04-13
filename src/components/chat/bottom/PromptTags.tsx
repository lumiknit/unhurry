import {
	Component,
	createEffect,
	createSignal,
	For,
	JSX,
	Match,
	Show,
	splitProps,
	Switch,
} from 'solid-js';
import { toast } from 'solid-toast';

import { vibrate } from '@/store/global_actions';

import { PromptTag } from '@lib/config';

import { getUserConfig, setUserConfig } from '@store';
import { createIsMobile } from '@/components/utils/media';
import { BiSolidChevronsRight } from 'solid-icons/bi';

type TagProps = JSX.HTMLAttributes<HTMLButtonElement> & {
	class?: string;
	children: JSX.Element;
	onClick?: (e: MouseEvent) => void;
};

const Tag: Component<TagProps> = (props) => {
	const [tagProps, btnProps] = splitProps(props, [
		'children',
		'class',
		'onClick',
	]);
	return (
		<button
			{...btnProps}
			class={'tag mr-1 ' + (tagProps.class || '')}
			onClick={(e) => {
				vibrate('medium');
				tagProps.onClick?.(e);
			}}
		>
			{tagProps.children}
		</button>
	);
};

const AutoSendTag: Component = () => {
	const isMobile = createIsMobile();

	const autoSendTimeout = (): number | undefined => {
		const v = getUserConfig()?.autoSendMillis;
		if (v && v > 0) {
			return Math.floor(v);
		}
	};

	const toggleAutoSend = (e: MouseEvent) => {
		e.stopPropagation();
		setUserConfig((c) => ({
			...c,
			enableAutoSend: !c.enableAutoSend,
		}));
	};

	return (
		<Tag
			class={getUserConfig()?.enableAutoSend ? 'is-primary' : ''}
			onClick={toggleAutoSend}
		>
			<span class="icon">
				<BiSolidChevronsRight />
			</span>
			<Show when={!isMobile()}>
				<Switch>
					<Match when={getUserConfig()?.enableAutoSend}>
						Auto: {(autoSendTimeout()! / 1000).toFixed(1)}s
					</Match>
					<Match when>No-auto</Match>
				</Switch>
			</Show>
		</Tag>
	);
};

interface Props {
	children?: JSX.Element | JSX.Element[];

	/**
	 * Text state.
	 * BeforeCursor, Selection, AfterCursor
	 */
	textState: [string, string, string];

	onInsertText: (text: string, send: boolean) => void;
	onInsertStartText: (text: string, send: boolean) => void;
	onInsertEndText: (text: string, send: boolean) => void;
	onReplaceText: (text: string, send: boolean) => void;
}

const PromptTags: Component<Props> = (props) => {
	const [filtered, setFiltered] = createSignal<PromptTag[]>([]);

	const promptTags = () => getUserConfig()?.promptTags || [];

	const handlePromptTagClick = (e: MouseEvent, tag: PromptTag) => {
		e.stopPropagation();
		switch (tag.action) {
			case 'insert':
				props.onInsertText(tag.prompt, !!tag.sendImmediately);
				break;
			case 'insert-start':
				props.onInsertStartText(tag.prompt, !!tag.sendImmediately);
				break;
			case 'insert-end':
				props.onInsertEndText(tag.prompt, !!tag.sendImmediately);
				break;
			case 'replace':
				props.onReplaceText(tag.prompt, !!tag.sendImmediately);
				break;
			default:
				toast.error(`Unknown PromptTag action: ${tag.action}`);
		}
	};

	createEffect(() => {
		const ln =
			props.textState[0].length +
			props.textState[1].length +
			props.textState[2].length;
		const nonWordIdx = props.textState[0].lastIndexOf(' ');
		const lastWord =
			nonWordIdx === -1
				? props.textState[0]
				: props.textState[0].slice(nonWordIdx + 1);
		const v = [...promptTags()].filter((tag) => {
			switch (tag.showCondition) {
				case 'empty':
					return ln === 0;
				case 'non-empty':
					return ln > 0;
				case 'prefix':
					return (
						lastWord.length > 0 &&
						(tag.showConditionParam || '').startsWith(lastWord)
					);
				default:
					return true;
			}
		});
		setFiltered(v);
	});

	return (
		<div class="input-tags">
			{props.children}
			<AutoSendTag />
			<For each={filtered()}>
				{(tag) => (
					<Tag
						class={'is-' + tag.color}
						onClick={(e: MouseEvent) =>
							handlePromptTagClick(e, tag)
						}
					>
						{tag.tag}
					</Tag>
				)}
			</For>
		</div>
	);
};

export default PromptTags;
