import { Component, For, JSX, Match, splitProps, Switch } from 'solid-js';
import { toast } from 'solid-toast';

import { PromptTag } from '@lib/config';

import { getUserConfig, setUserConfig } from '@store';

type TagProps = JSX.HTMLAttributes<HTMLButtonElement> & {
	class?: string;
	children: JSX.Element;
};

const Tag: Component<TagProps> = (props) => {
	const [tagProps, btnProps] = splitProps(props, ['children', 'class']);
	return (
		<button {...btnProps} class={'tag mr-1 ' + (tagProps.class || '')}>
			{tagProps.children}
		</button>
	);
};

const AutoSendTag: Component = () => {
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
			<Switch>
				<Match when={getUserConfig()?.enableAutoSend}>
					Auto: {(autoSendTimeout()! / 1000).toFixed(1)}s
				</Match>
				<Match when>No-auto</Match>
			</Switch>
		</Tag>
	);
};

const RunCodeTag: Component = () => {
	const toggleRunCode = (e: MouseEvent) => {
		e.stopPropagation();
		setUserConfig((c) => ({
			...c,
			enableRunCode: !c.enableRunCode,
		}));
	};

	return (
		<Tag
			class={getUserConfig()?.enableRunCode ? 'is-primary' : ''}
			onClick={toggleRunCode}
		>
			<Switch>
				<Match when={getUserConfig()?.enableRunCode}>Run</Match>
				<Match when>No Run</Match>
			</Switch>
		</Tag>
	);
};

interface Props {
	onInsertText: (text: string) => void;
	onReplaceText: (text: string) => void;
}

const PromptTags: Component<Props> = (props) => {
	const promptTags = () => getUserConfig()?.promptTags || [];

	const handlePromptTagClick = (e: MouseEvent, tag: PromptTag) => {
		e.stopPropagation();
		switch (tag.action) {
			case 'insert':
				props.onInsertText(tag.prompt);
				break;
			case 'replace':
				props.onReplaceText(tag.prompt);
				break;
			default:
				toast.error(`Unknown PromptTag action: ${tag.action}`);
		}
	};

	return (
		<div class="input-tags">
			<RunCodeTag />
			<AutoSendTag />
			<For each={promptTags()}>
				{(tag) => (
					<Tag
						class={'is-' + tag.color}
						onClick={(e) => handlePromptTagClick(e, tag)}
					>
						{tag.tag}
					</Tag>
				)}
			</For>
		</div>
	);
};

export default PromptTags;
