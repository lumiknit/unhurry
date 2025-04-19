import { useNavigate } from '@solidjs/router';
import { Component, createEffect, JSX, onCleanup, onMount } from 'solid-js';
import { Toaster } from 'solid-toast';

import { ConfirmModal } from './components/modal-confirm';
import NavBar from './components/navbar/NavBar';
import { rootPath } from './env';
import { globalShortcutHandler } from './lib';
import { getNextURL } from './store';

interface Props {
	children?: JSX.Element | JSX.Element[];
}

const App: Component<Props> = (props) => {
	const navigate = useNavigate();

	createEffect(() => {
		const u = getNextURL();
		console.log('goto', u);
		if (u) {
			navigate(`${rootPath}${u}`);
		}
	});

	onMount(() => {
		window.addEventListener('keydown', globalShortcutHandler);
	});

	onCleanup(() => {
		window.removeEventListener('keydown', globalShortcutHandler);
	});

	return (
		<>
			<Toaster
				toastOptions={{
					className: 'toast-item',
				}}
				containerClassName="toaster"
				position="top-center"
			/>
			<ConfirmModal />

			<NavBar />

			{props.children}
		</>
	);
};

export default App;
