import {
	Accessor,
	Component,
	createEffect,
	createSignal,
	For,
	JSX,
	Match,
	onCleanup,
	Show,
	splitProps,
	Switch,
} from 'solid-js';
import { toast } from 'solid-toast';

import { openArtifactUploadModal } from '@/components/modal/ArtifactUploadModal';
import { vibrate } from '@/store/global_actions';

import { PromptTag } from '@lib/config';

import { getUserConfig } from '@store';

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

type UploadByURLTag = {
	url: string;
	onRemovePrev: (text: string) => void;
	onFile(name: string, id: string): void;
};

const UploadByURLTag: Component<UploadByURLTag> = (props) => {
	return (
		<Tag
			color="primary"
			onClick={async () => {
				const meta = await openArtifactUploadModal({
					initURL: props.url.trim(),
				});
				if (meta) {
					// Trim the url from the textarea
					props.onFile(meta.name, meta._id);
					props.onRemovePrev(props.url);
				}
			}}
		>
			Upload by URL
		</Tag>
	);
};

interface Props {
	children?: JSX.Element | JSX.Element[];

	/**
	 * Text state.
	 * BeforeCursor, Selection, AfterCursor
	 */
	textState: Accessor<[string, string, string]>;

	onInsertText: (text: string, send: boolean) => void;
	onInsertStartText: (text: string, send: boolean) => void;
	onInsertEndText: (text: string, send: boolean) => void;
	onReplaceText: (text: string, send: boolean) => void;
	onRemovePrev: (text: string) => void;

	onFile: (name: string, id: string) => void;
}

const urlRE = /https?:\/\/[^\s]+\s*$/;

const PromptTags: Component<Props> = (props) => {
	const [filtered, setFiltered] = createSignal<PromptTag[] | undefined>();
	const [showUploadByURL, setShowUploadByURL] = createSignal<string | false>(
		false
	);

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

	let filterTO: number | undefined;

	const updateFilter = () => {
		filterTO = undefined;
		const ts = props.textState();
		const ln = ts[0].length + ts[1].length + ts[2].length;
		const nonWordIdx = ts[0].lastIndexOf(' ');
		const lastWord =
			nonWordIdx === -1 ? ts[0] : ts[0].slice(nonWordIdx + 1);
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

		const url = ts[0].match(urlRE);
		if (url) {
			setShowUploadByURL(url[0]);
		} else {
			setShowUploadByURL(false);
		}
	};

	createEffect(() => {
		props.textState();
		if (!filterTO) {
			filterTO = window.setTimeout(updateFilter, 1000);
			setFiltered(undefined);
		}
	});

	onCleanup(() => {
		if (filterTO) {
			window.clearTimeout(filterTO);
			filterTO = undefined;
		}
	});

	return (
		<div class="input-tags">
			{props.children}
			<Show when={showUploadByURL()}>
				<UploadByURLTag
					url={showUploadByURL() as string}
					onRemovePrev={props.onRemovePrev}
					onFile={props.onFile}
				/>
			</Show>
			<Switch>
				<Match when={filtered() === undefined}>
					<span>...</span>
				</Match>
				<Match when>
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
				</Match>
			</Switch>
		</div>
	);
};

export default PromptTags;
