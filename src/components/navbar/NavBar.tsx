import { A, useNavigate } from '@solidjs/router';
import {
	TbFilePlus,
	TbFolderSearch,
	TbQuestionMark,
	TbSettings,
} from 'solid-icons/tb';
import { Component, onMount } from 'solid-js';
import toast from 'solid-toast';

import ModelDropdown from './ModelDropdown';
import { rootPath } from '../../env';
import { newChat } from '../../store/actions';

const NavBar: Component = () => {
	let burgerRef: HTMLAnchorElement;
	let menuRef: HTMLDivElement;

	const navigate = useNavigate();

	const handleBurgerClick = () => {
		burgerRef!.classList.toggle('is-active');
		menuRef!.classList.toggle('is-active');
	};

	const close = () => {
		burgerRef!.classList.remove('is-active');
		menuRef!.classList.remove('is-active');
	};

	const handleNew = () => {
		toast.success('New notebook created');
		navigate(`${rootPath}/`);
		newChat();
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
					<img src={`${rootPath}/favicon-96x96.png`} />
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
				<div class="navbar-start">
					<a class="navbar-item" onClick={handleNew}>
						<TbFilePlus />
						New
					</a>
					<div class="navbar-item has-dropdown is-hoverable">
						<a class="navbar-link">Menu</a>
						<div class="navbar-dropdown">
							<A class="navbar-item" href="/notebooks">
								<TbFolderSearch />
								Open
							</A>
							<hr class="navbar-divider" />
							<A
								class="navbar-item"
								href={`${rootPath}/settings`}
							>
								<TbSettings />
								Settings
							</A>
							<A class="navbar-item" href={`${rootPath}/about`}>
								<TbQuestionMark />
								About
							</A>
						</div>
					</div>
				</div>

				<div class="navbar-end">
					<div class="navbar-item">
						<ModelDropdown />
					</div>
				</div>
			</div>
		</nav>
	);
};

export default NavBar;
