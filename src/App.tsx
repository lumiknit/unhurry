import { Component, JSX } from 'solid-js';
import { Toaster } from 'solid-toast';

import { ConfirmModal } from './components/modal-confirm';
import NavBar from './components/navbar/NavBar';

interface Props {
	children?: JSX.Element | JSX.Element[];
}

const App: Component<Props> = (props) => {
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
