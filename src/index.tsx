import { Route, Router } from '@solidjs/router';
import { lazy } from 'solid-js';
import { render } from 'solid-js/web';
import 'solid-devtools';

import './styles/index.scss';
import App from './App.tsx';
import { rootPath } from './env.ts';

import './lib/service-worker';

const About = lazy(() => import('@components/About.tsx'));
const ArtifactListPage = lazy(
	() => import('@components/artifact-list/ArtifactListPage.tsx')
);
const ChatPage = lazy(() => import('@components/chat/ChatPage.tsx'));
const ChatListPage = lazy(
	() => import('@components/chat-list/ChatListPage.tsx')
);
const LogsPage = lazy(() => import('@components/logs-page/LogsPage.tsx'));
const SettingsPage = lazy(
	() => import('@components/settings/SettingsPage.tsx')
);

const root = document.getElementById('root');

render(
	() => (
		<Router root={App}>
			<Route path={`${rootPath}/`} component={ChatPage} />
			<Route path={`${rootPath}/about`} component={About} />
			<Route path={`${rootPath}/chats`} component={ChatListPage} />
			<Route
				path={`${rootPath}/artifacts`}
				component={ArtifactListPage}
			/>
			<Route path={`${rootPath}/settings`} component={SettingsPage} />
			<Route path={`${rootPath}/logs`} component={LogsPage} />
		</Router>
	),
	root!
);
