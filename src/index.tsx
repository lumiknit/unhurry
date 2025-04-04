import { Route, Router } from '@solidjs/router';
import { render } from 'solid-js/web';
import 'solid-devtools';

import About from '@components/About.tsx';
import ChatPage from '@components/chat/ChatPage.tsx';
import ChatListPage from '@components/chat-list/ChatListPage.tsx';
import FileListPage from '@components/file-list/FileListPage.tsx';
import LogsPage from '@components/logs-page/LogsPage.tsx';
import SettingsPage from '@components/settings/SettingsPage.tsx';
import TaskCreatePage from '@components/task/TaskCreatePage.tsx';
import TaskListPage from '@components/task/TaskListPage.tsx';
import TaskPage from '@components/task/TaskPage.tsx';
import TeamPage from '@components/task/TeamPage.tsx';

import './index.scss';
import App from './App.tsx';
import { rootPath } from './env.ts';

import './lib/service-worker';
import './lib/json_schema.ts';

const root = document.getElementById('root');

render(
	() => (
		<Router root={App}>
			<Route path={`${rootPath}/`} component={ChatPage} />
			<Route path={`${rootPath}/about`} component={About} />
			<Route path={`${rootPath}/chats`} component={ChatListPage} />
			<Route path={`${rootPath}/tasks`} component={TaskListPage} />
			<Route path={`${rootPath}/task/new`} component={TaskCreatePage} />
			<Route path={`${rootPath}/tasks/:id`} component={TaskPage} />
			<Route path={`${rootPath}/team`} component={TeamPage} />
			<Route path={`${rootPath}/files`} component={FileListPage} />
			<Route path={`${rootPath}/settings`} component={SettingsPage} />
			<Route path={`${rootPath}/logs`} component={LogsPage} />
		</Router>
	),
	root!
);
