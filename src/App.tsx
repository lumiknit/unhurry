import { useNavigate } from '@solidjs/router';
import { Component, createEffect, JSX, onCleanup, onMount } from 'solid-js';
import toast, { Toaster } from 'solid-toast';

import ModalContainer from '@/components/modal/ModalContainer';
import NavBar from '@/components/navbar/NavBar';

import { openSample } from './components/modal/example';
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

	const handleTest = async () => {
		toast('OPEN');
		const t = await openSample();
		toast('DONE: ' + t);
	};

	return (
		<>
			<Toaster
				toastOptions={{
					className: 'toast-item',
				}}
				containerClassName="toaster"
				position="top-center"
			/>
			<ModalContainer />

			<NavBar />

			<button class="button is-primary" onClick={handleTest}>
				Test
			</button>

			{props.children}
		</>
	);
};

export default App;
