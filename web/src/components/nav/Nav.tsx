import { useNavigate } from '@solidjs/router';
import { Component, createSignal } from 'solid-js';

import NavModal from './NavModal';
import './Nav.scss';

const UnhurryIcon = () => (
	<svg
		width="28"
		height="28"
		viewBox="0 0 135.46666 135.46667"
		xmlns="http://www.w3.org/2000/svg"
	>
		<g transform="matrix(0.85976164,0,0,0.98903125,8.6639715,-1.21031)">
			<path
				fill="currentColor"
				style={{ 'fill-opacity': 1 }}
				d="M 113.60713,14.067453 47.037417,23.56681 21.859531,35.944558 27.979166,65.329615 Z"
			/>
			<path
				fill="currentColor"
				style={{ 'fill-opacity': 0.8 }}
				d="m 21.859531,35.944558 6.119635,29.385057 73.640684,7.060429 17.82384,-28.103724 z"
			/>
			<path
				fill="currentColor"
				style={{ 'fill-opacity': 1 }}
				d="M 119.44369,44.28632 101.61985,72.390044 38.35989,106.02036 26.038272,83.176014 Z"
			/>
			<path
				fill="currentColor"
				style={{ 'fill-opacity': 0.7 }}
				d="M 26.038272,83.176014 38.35989,106.02036 72.082213,114.70456 88.00122,95.063885 Z"
			/>
			<path
				fill="currentColor"
				style={{ 'fill-opacity': 1 }}
				d="M 88.00122,95.063885 39.687507,127.4892 72.082213,114.70456 Z"
			/>
		</g>
	</svg>
);

const Nav: Component = () => {
	const [isOpen, setIsOpen] = createSignal(false);
	const navigate = useNavigate();

	const handleNav = (path: string) => {
		navigate(path);
		setIsOpen(false);
	};

	return (
		<>
			<div class="nav-trigger" onClick={() => setIsOpen(true)}>
				<UnhurryIcon />
			</div>

			<NavModal
				isOpen={isOpen}
				onClose={() => setIsOpen(false)}
				onNavigate={handleNav}
			/>
		</>
	);
};

export default Nav;
