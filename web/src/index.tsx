/* @refresh reload */
import { HashRouter, Route, type RouteSectionProps } from '@solidjs/router';
import type { Component } from 'solid-js';
import { render } from 'solid-js/web';
import { Toaster } from 'solid-toast';
import 'solid-devtools';

import './styles/index.scss';

import ChatPage from './features/chat/Page';
import ChatListPage from './features/chat-list/Page';
import HomePage from './features/home/Page';
import SettingsPage from './features/settings/Page';
import Nav from './shared/nav/Nav';

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
			<Route path="/" component={HomePage} />
			<Route path="/chats" component={ChatListPage} />
			<Route path="/chats/:id" component={ChatPage} />
			<Route path="/settings" component={SettingsPage} />
		</HashRouter>
	),
	root!
);
