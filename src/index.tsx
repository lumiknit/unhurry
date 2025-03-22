import { Route, Router } from '@solidjs/router';
import { render } from 'solid-js/web';

import About from '@components/About.tsx';
import ChatPage from '@components/chat/ChatPage.tsx';
import ChatListPage from '@components/chat-list/ChatListPage.tsx';
import LogsPage from '@components/logs-page/LogsPage.tsx';
import SettingsPage from '@components/settings/SettingsPage.tsx';

import './index.scss';
import App from './App.tsx';
import FileListPage from './components/file-list/FileListPage.tsx';
import { rootPath } from './env.ts';

import './lib/service-worker';

const root = document.getElementById('root');

render(
	() => (
		<Router root={App}>
			<Route path={`${rootPath}/`} component={ChatPage} />
			<Route path={`${rootPath}/about`} component={About} />
			<Route path={`${rootPath}/chat-list`} component={ChatListPage} />
			<Route path={`${rootPath}/file-list`} component={FileListPage} />
			<Route path={`${rootPath}/settings`} component={SettingsPage} />
			<Route path={`${rootPath}/logs`} component={LogsPage} />
		</Router>
	),
	root!
);
