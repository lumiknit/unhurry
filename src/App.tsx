import { Component, JSX } from 'solid-js';
import { Toaster } from 'solid-toast';

import NavBar from './components/navbar/NavBar';

type Props = {
	children?: JSX.Element | JSX.Element[];
};

const App: Component<Props> = (props) => {
	return (
		<>
			<Toaster containerClassName="toaster" position="bottom-center" />

			<NavBar />

			{props.children}
		</>
	);
};

export default App;
