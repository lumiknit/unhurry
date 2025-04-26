import {
	batch,
	Component,
	createSignal,
	For,
	onMount,
	Setter,
	Show,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { chatManager } from '@/lib/chat-manager/manager';
import {
	bringCommandUp,
	Command,
	filterCommands,
	getCommand,
} from '@/lib/command';
import { openChat } from '@/store/global_actions';

import { setShowPalette } from './state';

type PaletteItemProps = {
	cmd: Command;
	selected?: boolean;

	onClick: () => void;
};

const PaletteItem: Component<PaletteItemProps> = (props) => {
	return (
		<div
			class={`plt-item ${props.selected ? 'selected' : ''}`}
			onClick={props.onClick}
		>
			<span class="plt-icon">
				<Show when={props.cmd.icon}>
					<Dynamic component={props.cmd.icon} />
				</Show>
			</span>
			<span>{props.cmd.name}</span>
			<Show when={props.cmd.shortcut}>
				<span class="plt-shortcut">{props.cmd.shortcut}</span>
			</Show>
		</div>
	);
};

type Props = {
	init: string;
};

const Palette: Component<Props> = (props) => {
	let inputRef: HTMLInputElement;
	let itemsRef: HTMLDivElement;

	const [commands, setCommands] = createSignal<Command[]>([]);
	const [selected, setSelected] = createSignal(0);

	const changeSelected: Setter<number> = (t) => {
		const v = setSelected(t);
		const elem = document.querySelector(
			`div.plt-item:nth-child(${v + 1})`
		) as HTMLElement;
		if (elem) {
			const height = itemsRef!.clientHeight;
			itemsRef!.scrollTo(0, elem.offsetTop - height / 2);
		}
		return v;
	};

	const runCommand = (idx: number) => {
		const cmd = commands()[idx];
		console.log(cmd);
		if (cmd) {
			bringCommandUp(cmd.id);
			setShowPalette(false);
			cmd.action();
		}
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		let handled = true;
		switch (e.key) {
			case 'ArrowUp':
				changeSelected((s) => Math.max(0, s - 1));
				break;
			case 'ArrowDown':
				changeSelected((s) => Math.min(commands().length - 1, s + 1));
				break;
			case 'Escape':
				setShowPalette(false);
				break;
			case 'Enter':
				runCommand(selected());
				break;
			default:
				handled = false;
		}
		if (handled) {
			e.preventDefault();
			e.stopPropagation();
		}
	};

	const updateCommands = () => {
		const input = inputRef!.value;
		batch(() => {
			let newCmds = [];
			if (input.startsWith('/')) {
				const filtered = filterCommands(input.slice(1));
				newCmds = setCommands(filtered);
			} else {
				const ongoings = chatManager
					.getOngoings()
					.filter((x) => x.ctx.title.includes(input.trim()));
				newCmds = setCommands([
					getCommand('chat.new')!,
					...ongoings.map((x) => ({
						id: x.ctx._id,
						name: x.ctx.title || '<Untitled>',
						action: () => {
							openChat(x.ctx._id);
						},
					})),
				]);
			}
			changeSelected((v) => Math.max(0, Math.min(newCmds.length - 1, v)));
		});
	};

	onMount(() => {
		inputRef!.focus();
		updateCommands();
	});

	return (
		<div class="plt is-rounded has-shadow">
			<input
				ref={inputRef!}
				class="plt-input"
				type="text"
				placeholder="Search..."
				onKeyDown={handleKeyDown}
				onInput={updateCommands}
				onBlur={() => {
					setTimeout(() => {
						setShowPalette(false);
					}, 100);
				}}
				value={props.init}
			/>
			<div ref={itemsRef!} class="plt-items">
				<For each={commands()}>
					{(c, idx) => (
						<PaletteItem
							cmd={c}
							selected={idx() === selected()}
							onClick={() => runCommand(idx())}
						/>
					)}
				</For>
			</div>
		</div>
	);
};

export default Palette;
