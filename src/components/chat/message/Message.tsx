import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import mermaid from 'mermaid';
import { VsChevronDown, VsChevronUp, VsCopy } from 'solid-icons/vs';
import {
	Component,
	createSignal,
	For,
	Match,
	onMount,
	Show,
	Switch,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { toast } from 'solid-toast';

import { logr } from '@/lib/logr';

import {
	Msg,
	MSG_PART_TYPE_FUNCTION_CALL,
	MSG_PART_TYPE_MERMAID,
	MSG_PART_TYPE_RUN_JS,
	MSG_PART_TYPE_SVG,
	MSG_PART_TYPE_TEXT,
	MSG_PART_TYPE_THINK,
} from '@lib/chat';

import JSONLikeMessage from './JSONLikeMessage';
import { ItemProps } from './message_types';
import FnCallMessage from './FnCallMessage';

marked.use(
	markedKatex({
		nonStandard: true,
		throwOnError: false,
	})
);

mermaid.initialize({
	suppressErrorRendering: true,
});

/**
 * Rendering text as markdown
 */
const TextMessage: Component<ItemProps> = (props) => {
	const [html, setHtml] = createSignal('');

	const setMD = async (v: string) => {
		const html = await marked(v, { async: true });
		const sanitized = html; //DOMPurify.sanitize(html);
		setHtml(sanitized.replace(/<a href/g, '<a target="_blank" href'));
	};

	onMount(async () => {
		await setMD(props.content);
	});

	return <div class="content" innerHTML={html()} />;
};

const BlockMessage: Component<ItemProps> = (props) => {
	const [html, setHtml] = createSignal('');
	const [fold, setFold] = createSignal(
		props.type === MSG_PART_TYPE_THINK || props.content.length > 1000
	);
	const [lines, setLines] = createSignal(0);
	// Use highlight.js to highlight code

	onMount(async () => {
		let language = props.type;
		if (language === 'run-js') language = 'javascript';
		if (hljs.getLanguage(language) === undefined) {
			language = 'plaintext';
		}

		const result = hljs.highlight(props.content, { language });
		setHtml(DOMPurify.sanitize(result.value));
		setLines(props.content.split('\n').length);
	});

	const handleCopy = () => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(props.content);
		} else {
			// Fallback for older browsers
			const el = document.createElement('textarea');
			el.value = props.content;
			document.body.appendChild(el);
			el.select();
			document.execCommand('copy');
			document.body.removeChild(el);
		}
		toast.success('Copied to clipboard');
	};

	return (
		<Switch>
			<Match when={fold()}>
				<div
					class="msg-code msg-code-fold flex-split"
					onClick={() => setFold(false)}
				>
					<span>
						{props.type} ({lines()} lines)
					</span>
					<button>
						<VsChevronDown />
					</button>
				</div>
			</Match>
			<Match when>
				<div class="msg-code">
					<header class="flex-split" onClick={() => setFold(true)}>
						<span>{props.type}</span>
						<span>
							<button
								class="px-2"
								onClick={(e) => {
									handleCopy();
									e.stopPropagation();
								}}
							>
								<VsCopy /> copy
							</button>
							<button>
								<VsChevronUp />
							</button>
						</span>
					</header>
					<div class="msg-code-body" innerHTML={html()} />
				</div>
				<Show when={lines() > 10 || props.content.length > 800}>
					<div class="msg-code-bottom-btns has-text-right is-size-7">
						<span>
							<button class="px-3 py-1" onClick={handleCopy}>
								copy
							</button>
							{' | '}
							<button
								class="px-3 py-1"
								onClick={() => setFold(true)}
							>
								fold
							</button>
						</span>
					</div>
				</Show>
			</Match>
		</Switch>
	);
};

const SvgMessage: Component<ItemProps> = (props) => {
	const content = DOMPurify.sanitize(props.content);
	const [raw, setRaw] = createSignal(false);
	return (
		<div class="msg-code">
			<header class="flex-split" onClick={() => setRaw((r) => !r)}>
				SVG
				<Switch>
					<Match when={raw()}>
						<span>[raw]</span>
					</Match>
					<Match when>
						<span>[img]</span>
					</Match>
				</Switch>
			</header>
			<div class="msg-svg-body">
				<Switch>
					<Match when={raw()}>{content}</Match>
					<Match when>
						<div class="msg-svg" innerHTML={content} />
					</Match>
				</Switch>
			</div>
		</div>
	);
};

const MermaidMessage: Component<ItemProps> = (props) => {
	const [svg, setSvg] = createSignal('');
	const [err, setErr] = createSignal('');

	onMount(async () => {
		try {
			const { svg } = await mermaid.render('mermaid', props.content);
			setSvg(DOMPurify.sanitize(svg));
			setErr('');
		} catch (error) {
			logr.error('Error rendering Mermaid diagram:', error);
			setErr(`${error}`);
		}
	});

	return (
		<Switch>
			<Match when={err()}>
				<div class="notification is-danger">
					Mermaid Error: {err()}
					<pre>{props.content}</pre>
				</div>
			</Match>
			<Match when>
				<div class="msg-mermaid" innerHTML={svg()} />
			</Match>
		</Switch>
	);
};

const compMap = new Map([
	[MSG_PART_TYPE_TEXT, TextMessage],
	[MSG_PART_TYPE_FUNCTION_CALL, FnCallMessage],
	[MSG_PART_TYPE_RUN_JS, BlockMessage],
	[MSG_PART_TYPE_SVG, SvgMessage],
	[MSG_PART_TYPE_MERMAID, MermaidMessage],
	['json', JSONLikeMessage],
]);

interface Props {
	msg: Msg;
	idx: number;
}

const Message: Component<Props> = (props) => {
	const cls =
		'msg ' + (props.msg.role === 'user' ? 'msg-user' : 'msg-assistant');
	return (
		<div class={cls}>
			<div class="message-body">
				<For each={props.msg.parts}>
					{(part) => (
						<Dynamic
							component={compMap.get(part.type) || BlockMessage}
							type={part.type}
							content={part.content}
						/>
					)}
				</For>
			</div>
		</div>
	);
};

export default Message;
