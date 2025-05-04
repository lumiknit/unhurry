import { useNavigate } from '@solidjs/router';
import { Component, createEffect, JSX, onCleanup, onMount } from 'solid-js';
import { Toaster } from 'solid-toast';

import ModalContainer from '@/components/modal/ModalContainer';
import NavBar from '@/components/navbar/NavBar';
import { handleKey } from '@/lib/command/command';
import '@/lib/command/default';
import { logr } from '@/lib/logr';
import { getNextURL } from '@/store/nav';

import PaletteContainer from './components/palette/PaletteContainer';
import { rootPath } from './env';

interface Props {
	children?: JSX.Element | JSX.Element[];
}

const App: Component<Props> = (props) => {
	const navigate = useNavigate();

	createEffect(() => {
		const u = getNextURL();
		logr.info('goto', u);
		if (u) {
			navigate(`${rootPath}${u}`);
		}
	});

	onMount(() => {
		window.addEventListener('keydown', handleKey);
	});

	onCleanup(() => {
		window.removeEventListener('keydown', handleKey);
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
			<ModalContainer />
			<PaletteContainer />

			<NavBar />

			{props.children}
		</>
	);
};

export default App;
