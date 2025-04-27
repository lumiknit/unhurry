import { Component, createSignal, For, Show, Setter, JSX } from 'solid-js';

export type DropdownItem = {
	icon: Component;
	label: string;
	onClick: () => void;
};

type DropdownProps = {
	divClass?: string;
	btnClass?: string;
	items: DropdownItem[][];

	children: JSX.Element;
};

const Dropdown: Component<DropdownProps> = (props) => {
	let rootRef: HTMLDivElement;
	const [open, setOpen_] = createSignal(false);

	const setOpen: Setter<boolean> = (v) => {
		const x = setOpen_(v);
		if (x) {
			document.addEventListener('click', handleOutsideClick);
		} else {
			document.removeEventListener('click', handleOutsideClick);
		}
	};

	const handleOutsideClick = (e: MouseEvent) => {
		if (!rootRef!.contains(e.target as Node)) {
			setOpen(false);
		}
	};

	return (
		<div
			ref={rootRef!}
			class={`dropdown ${open() ? 'is-active' : ''} ${props.divClass || ''}`}
		>
			<div class="dropdown-trigger">
				<button
					class={props.btnClass}
					aria-haspopup="true"
					aria-controls="dropdown-menu"
					onClick={() => setOpen(!open())}
				>
					{props.children}
				</button>
			</div>
			<div class="dropdown-menu" id="dropdown-menu" role="menu">
				<div class="dropdown-content">
					<For each={props.items}>
						{(links, j) => (
							<>
								<Show when={j() > 0}>
									<hr class="my-1" />
								</Show>
								<For each={links}>
									{(link) => (
										<a
											class="dropdown-item"
											href="#"
											onClick={() => {
												link.onClick();
												setOpen(false);
											}}
										>
											<span class="icon">
												<link.icon />
											</span>
											<span>{link.label}</span>
										</a>
									)}
								</For>
							</>
						)}
					</For>
				</div>
			</div>
		</div>
	);
};

export default Dropdown;
