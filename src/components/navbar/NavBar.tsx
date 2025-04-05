import { A } from '@solidjs/router';
import {
	BiRegularCog,
	BiRegularFolder,
	BiRegularHistory,
	BiRegularQuestionMark,
} from 'solid-icons/bi';
import { FaSolidListCheck } from 'solid-icons/fa';
import { Component, Match, onMount, Switch } from 'solid-js';

import { rootPath } from '@/env';
import { taskStore } from '@/store/task';

import ModelDropdown from './ModelDropdown';

const NavBar: Component = () => {
	let burgerRef: HTMLAnchorElement;
	let menuRef: HTMLDivElement;

	const handleBurgerClick = () => {
		burgerRef!.classList.toggle('is-active');
		menuRef!.classList.toggle('is-active');
	};

	const close = () => {
		burgerRef!.classList.remove('is-active');
		menuRef!.classList.remove('is-active');
	};
	onMount(() => {
		menuRef!.querySelectorAll('a').forEach((a) => {
			if (!a.href) return;
			a.addEventListener('click', close);
		});
	});

	return (
		<nav
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

				<A class="navbar-item" href="/chats">
					<BiRegularHistory />
					<span class="is-hidden-mobile">Chats</span>
				</A>

				<A class="navbar-item" href="/tasks">
					<FaSolidListCheck />
					<span class="is-hidden-mobile">Tasks</span>
					<Switch>
						<Match when={taskStore.state.running === false}>
							<span class="indicator-off" />
						</Match>
						<Match when={taskStore.state.watchingTasks === -1}>
							<span class="indicator-on" />
						</Match>
						<Match when>
							<span class="spinner" />
						</Match>
					</Switch>
				</A>

				<a
					ref={burgerRef!}
					role="button"
					class="navbar-burger"
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
				class="navbar-menu no-user-select"
			>
				<div class="navbar-end">
					<div class="navbar-item">
						<ModelDropdown />
					</div>
					<div class="navbar-item has-dropdown is-hoverable">
						<a class="navbar-link">Menu</a>
						<div class="navbar-dropdown is-right">
							<A class="navbar-item" href={`${rootPath}/files`}>
								<BiRegularFolder />
								Files
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
