/* @refresh reload */
import { HashRouter, Route, type RouteSectionProps } from '@solidjs/router';
import type { Component } from 'solid-js';
import { render } from 'solid-js/web';
import { Toaster } from 'solid-toast';
import 'solid-devtools';

import './styles/index.scss';

import Nav from './components/nav/Nav';
import ChatList from './routes/ChatList';
import Main from './routes/Main';
import Settings from './routes/Settings';

const root = document.getElementById('root');

const Layout: Component<RouteSectionProps> = (props) => {
	return (
		<>
			<Toaster position="top-center" />
			<Nav />
			{props.children}
		</>
	);
};

render(
	() => (
		<HashRouter root={Layout}>
			<Route path="/" component={Main} />
			<Route path="/chats" component={ChatList} />
			<Route path="/settings" component={Settings} />
		</HashRouter>
	),
	root!
);
