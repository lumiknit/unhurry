import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import mermaid from 'mermaid';
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
import toast from 'solid-toast';

import {
	Msg,
	MSG_PART_TYPE_MERMAID,
	MSG_PART_TYPE_RUN_JS,
	MSG_PART_TYPE_SVG,
	MSG_PART_TYPE_TEXT,
	MSG_PART_TYPE_THINK,
} from '../../lib/chat';

marked.use(
	markedKatex({
		throwOnError: false,
	})
);

mermaid.initialize({
	suppressErrorRendering: true,
});

type ItemProps = {
	type: string;
	content: string;
};

/**
 * Rendering text as markdown
 */
const TextMessage: Component<ItemProps> = (props) => {
	const [html, setHtml] = createSignal('');

	onMount(async () => {
		const html = await marked(props.content, { async: true });
		setHtml(DOMPurify.sanitize(html));
	});

	return <div class="content" innerHTML={html()} />;
};

const BlockMessage: Component<ItemProps> = (props) => {
	const [html, setHtml] = createSignal('');
	const [fold, setFold] = createSignal(
		props.type === MSG_PART_TYPE_THINK || props.content.length > 1000
	);
	// Use highlight.js to highlight code

	onMount(async () => {
		let language = props.type;
		if (language === 'run-js') language = 'javascript';
		if (hljs.getLanguage(language) === undefined) {
			language = 'plaintext';
		}

		const result = hljs.highlight(props.content, { language });
		setHtml(DOMPurify.sanitize(result.value));
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
		<div class="msg-code-container">
			<header class="msg-code-header">
				<span>{props.type}</span>
				<button class="tag is-info ml-1" onClick={handleCopy}>
					Copy
				</button>
				<button
					class="tag is-warning ml-1"
					onClick={() => setFold(!fold())}
				>
					{fold() ? 'Expand' : 'Fold'}
				</button>
			</header>
			<Show when={!fold()}>
				<div class="msg-code" innerHTML={html()} />
			</Show>
		</div>
	);
};

const SvgMessage: Component<ItemProps> = (props) => {
	return (
		<div class="msg-svg" innerHTML={DOMPurify.sanitize(props.content)} />
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
			console.error('Error rendering Mermaid diagram:', error);
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
	[MSG_PART_TYPE_RUN_JS, BlockMessage],
	[MSG_PART_TYPE_SVG, SvgMessage],
	[MSG_PART_TYPE_MERMAID, MermaidMessage],
]);

type Props = {
	msg: Msg;
	idx: number;
};

const Message: Component<Props> = (props) => {
	const cls = props.msg.role === 'user' ? 'message' : '';
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
