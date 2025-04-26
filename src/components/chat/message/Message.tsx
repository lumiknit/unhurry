import { default as DOMPurify } from 'dompurify';
import { marked } from 'marked';
import markedKatex from 'marked-katex-extension';
import { VsChevronDown, VsChevronUp, VsCopy } from 'solid-icons/vs';
import { Component, createSignal, For, Match, onMount, Switch } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { toast } from 'solid-toast';

import { getBEService } from '@/lib/be';
import { getShowRawMessage } from '@/store';

import {
	convertMsgForLLM,
	Msg,
	MSG_PART_TYPE_ARTIFACT,
	MSG_PART_TYPE_FUNCTION_CALL,
	MSG_PART_TYPE_TEXT,
	MSG_PART_TYPE_THINK,
} from '@lib/chat';
import { copyToClipboard } from '@lib/clipboard';
import hljs from '@lib/hljs';
import { logr } from '@lib/logr';

import ArtifactMessage from './ArtifactMessage';
import BlockBottomButtons from './BlockBottomButtons';
import FnCallMessage from './FnCallMessage';
import JSONLikeMessage from './JSONLikeMessage';
import { ItemProps } from './message_types';

marked.use(
	markedKatex({
		nonStandard: true,
		throwOnError: false,
	})
);

let mermaidInitialized = false;

const initMermaid = async () => {
	const mermaid = (await import('mermaid')).default;
	if (!mermaidInitialized) {
		mermaid.initialize({
			suppressErrorRendering: true,
			htmlLabels: false,
		});
		mermaidInitialized = true;
	}
	return mermaid;
};

/**
 * Rendering text as markdown
 */
const TextMessage: Component<ItemProps> = (props) => {
	const [html, setHtml] = createSignal('');

	const setMD = async (v: string) => {
		const html = await marked(v, { async: true });
		const sanitized = DOMPurify.sanitize(html);
		setHtml(sanitized.replaceAll('<a href', '<a target="_blank" href'));
	};

	onMount(async () => {
		await setMD(props.content);
	});

	return <div class="content" innerHTML={html()} />;
};

const BlockMessage: Component<ItemProps> = (props) => {
	const [html, setHtml] = createSignal('');
	const [fold, setFold] = createSignal(
		props.type === MSG_PART_TYPE_THINK || props.content.length > 32000
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
		setHtml(result.value);
		setLines(props.content.split('\n').length);
	});

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
									copyToClipboard(props.content);
									toast.success('Copied!');
									e.stopPropagation();
								}}
							>
								<VsCopy />
								copy
							</button>
							<button>
								<VsChevronUp />
							</button>
						</span>
					</header>
					<div class="msg-code-body" innerHTML={html()} />
				</div>
				<BlockBottomButtons
					getContent={() => props.content}
					getLang={() => props.type}
					onToggleFold={() => setFold((s) => !s)}
				/>
			</Match>
		</Switch>
	);
};

/**
 * Common component for rendereable messages.
 * It can be
 * - Togglable between preview / raw
 * - Copy / Downloadable
 * - Rendered to some HTML
 */
const createPreviewMessage = (
	render: (content: string) => Promise<string>
): Component<ItemProps> => {
	return (props) => {
		const [html, setHtml] = createSignal('');
		const [err, setErr] = createSignal('');
		const [raw, setRaw] = createSignal(false);

		onMount(async () => {
			try {
				const renderedHtml = await render(props.content);
				setHtml(DOMPurify.sanitize(renderedHtml));
			} catch (error) {
				logr.error('Error rendering preview:', error);
				setErr(`${error}`);
			}
		});

		return (
			<>
				<div class="msg-code">
					<header
						class="flex-split"
						onClick={() => setRaw((r) => !r)}
					>
						<span>{props.type}</span>
						<span>
							<button
								class="px-2"
								onClick={(e) => {
									copyToClipboard(props.content);
									toast.success('Copied!');
									e.stopPropagation();
								}}
							>
								<VsCopy /> copy
							</button>
							<span>{raw() ? 'raw' : 'preview'}</span>
						</span>
					</header>
					<div class="msg-code-body">
						<Switch>
							<Match when={err()}>
								<div class="notification is-danger">
									Redering Error: {err()}
									<hr />
									{props.content}
								</div>
							</Match>
							<Match when={raw()}>{props.content}</Match>
							<Match when>
								<div class="msg-preview" innerHTML={html()} />
							</Match>
						</Switch>
					</div>
				</div>
				<BlockBottomButtons
					getContent={() => props.content}
					getLang={() => props.type}
				/>
			</>
		);
	};
};

const SvgMessage = createPreviewMessage(async (content) => {
	const html = DOMPurify.sanitize(content);
	return html;
});

const MermaidMessage = createPreviewMessage(async (content) => {
	const mermaid = await initMermaid();
	const { svg } = await mermaid.render('mermaid', content);
	return DOMPurify.sanitize(svg);
});

const MarkdownMessage = createPreviewMessage(async (content) => {
	const html = await marked(content, { async: true });
	return html;
});

const QRMessage = createPreviewMessage(async (content) => {
	const be = await getBEService();
	const html = be.genQRSVG(content);
	return html;
});

const compMap = new Map([
	[MSG_PART_TYPE_TEXT, TextMessage],
	[MSG_PART_TYPE_FUNCTION_CALL, FnCallMessage],
	[MSG_PART_TYPE_ARTIFACT, ArtifactMessage],
	['svg', SvgMessage],
	['mermaid', MermaidMessage],
	['json', JSONLikeMessage],
	['markdown', MarkdownMessage],
	['qr', QRMessage],
]);

const RawMessage: Component<Props> = (props) => {
	const [s, setS] = createSignal('');
	onMount(async () => {
		const v = await convertMsgForLLM(props.msg);
		setS(v.extractText());
	});
	return <div class="msg-raw">{s()}</div>;
};

interface Props {
	msg: Msg;
}

const Message: Component<Props> = (props) => {
	const cls =
		'message-body ' +
		(props.msg.role === 'user' ? 'msg-user ' : 'msg-assistant ') +
		(props.msg.uphurry ? ' is-uphurry' : '');
	return (
		<Switch>
			<Match when={getShowRawMessage()}>
				<div class={cls}>
					<RawMessage msg={props.msg} />
				</div>
			</Match>
			<Match when>
				<div class={cls}>
					<For each={props.msg.parts}>
						{(part) => (
							<Dynamic
								component={
									compMap.get(part.type) || BlockMessage
								}
								type={part.type}
								content={part.content}
							/>
						)}
					</For>
				</div>
			</Match>
		</Switch>
	);
};

export default Message;
