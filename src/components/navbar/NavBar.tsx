import { A } from '@solidjs/router';
import {
	BiRegularCog,
	BiRegularHistory,
	BiRegularPlus,
	BiRegularQuestionMark,
	BiSolidBox,
} from 'solid-icons/bi';
import { Component, createSignal, onCleanup, onMount, Setter } from 'solid-js';

import { rootPath } from '@/env';
import { gotoNewChat } from '@/store/global_actions';

import ModelDropdown from './ModelDropdown';

const NavBar: Component = () => {
	let rootRef: HTMLDivElement;
	let burgerRef: HTMLAnchorElement;
	let menuRef: HTMLDivElement;

	const [showMenu, setShowMenu_] = createSignal(false);

	const handleOutsideClick = (e: MouseEvent) => {
		// If outside of rootRef is clicked, close window
		if (!rootRef!.contains(e.target as Node)) {
			setShowMenu(false);
		}
	};

	const setShowMenu: Setter<boolean> = (value) => {
		const v = setShowMenu_(value);
		if (v) {
			window.addEventListener('click', handleOutsideClick, {});
		} else {
			window.removeEventListener('click', handleOutsideClick);
		}
	};

	const handleBurgerClick = () => {
		setShowMenu((s) => !s);
	};

	const close = () => {
		console.log('Close');
		setShowMenu(false);
	};

	onMount(() => {
		menuRef!.querySelectorAll('a').forEach((a) => {
			if (!a.href) return;
			a.addEventListener('click', close);
		});
	});

	onCleanup(() => {
		window.removeEventListener('click', handleOutsideClick);
	});

	return (
		<nav
			ref={rootRef!}
			class="navbar is-fixed-top"
			role="navigation"
			aria-label="main navigation"
		>
			<div class="navbar-brand">
				<A class="navbar-item" href={`${rootPath}/`}>
					<svg
						width="512"
						height="512"
						viewBox="0 0 135.46666 135.46667"
					>
						<use href={`${rootPath}/icon_mono.svg#icon`} />
					</svg>
				</A>

				<a class="navbar-item" onClick={() => gotoNewChat()}>
					<BiRegularPlus />
					<span class="is-hidden-mobile">New</span>
				</a>

				<A class="navbar-item" href="/chats">
					<BiRegularHistory />
					<span class="is-hidden-mobile">Chats</span>
				</A>

				<a
					ref={burgerRef!}
					role="button"
					class={'navbar-burger' + (showMenu() ? ' is-active' : '')}
					aria-label="menu"
					aria-expanded="false"
					data-target="navbarTarget"
					onClick={handleBurgerClick}
				>
					<span />
					<span />
					<span />
					<span />
				</a>
			</div>
			<div
				ref={menuRef!}
				id="navbarTarget"
				class={
					'navbar-menu no-user-select' +
					(showMenu() ? ' is-active' : '')
				}
			>
				<div class="navbar-end">
					<div class="navbar-item">
						<ModelDropdown />
					</div>
					<div class="navbar-item has-dropdown is-hoverable">
						<a class="navbar-link">Menu</a>
						<div class="navbar-dropdown is-boxed is-right">
							<A
								class="navbar-item"
								href={`${rootPath}/artifacts`}
							>
								<BiSolidBox />
								Artifacts
							</A>
							<A
								class="navbar-item"
								href={`${rootPath}/settings`}
							>
								<BiRegularCog />
								Settings
							</A>
							<A class="navbar-item" href={`${rootPath}/about`}>
								<BiRegularQuestionMark />
								About
							</A>
							<A class="navbar-item" href={`${rootPath}/logs`}>
								Logs
							</A>
						</div>
					</div>
				</div>
			</div>
		</nav>
	);
};

export default NavBar;
