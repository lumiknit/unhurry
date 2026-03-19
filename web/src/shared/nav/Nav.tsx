import { Component, createSignal, JSX } from 'solid-js';

import NavMenu from './NavMenu';
import UnhurryIcon from './UnhurryIcon';

import './Nav.scss';

type Props = {
	children: JSX.Element;
};

/** NavContainer wraps the contents with nav buttons */
const NavContainer: Component<Props> = (props) => {
	const [menuOpen, setMenuOpen] = createSignal(
		typeof window !== 'undefined' && window.innerWidth >= 1024
	);

	return (
		<>
			<button
				class="nav-toggle"
				classList={{ 'is-open': menuOpen() }}
				onClick={() => setMenuOpen((o) => !o)}
			>
				<UnhurryIcon />
			</button>
			<div class="nav-container" classList={{ 'is-open': menuOpen() }}>
				<NavMenu
					menuOpen={menuOpen()}
					closeMenu={() => setMenuOpen(false)}
				/>
				<div class="navc-content">{props.children}</div>
			</div>
		</>
	);
};

export default NavContainer;
