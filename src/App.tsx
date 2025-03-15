import { Component, JSX } from 'solid-js';
import { Toaster } from 'solid-toast';

import NavBar from './components/navbar/NavBar';

type Props = {
	children?: JSX.Element | JSX.Element[];
};

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

			<NavBar />

			{props.children}
		</>
	);
};

export default App;
