import { Route, Router } from '@solidjs/router';
import { render } from 'solid-js/web';

import './index.scss';
import App from './App.tsx';
import About from './components/About.tsx';
import MainView from './components/chat/MainView.tsx';
import SettingsPage from './components/settings/SettingsPage.tsx';
import { rootPath } from './env.ts';

const root = document.getElementById('root');

render(
	() => (
		<Router root={App}>
			<Route path={`${rootPath}/`} component={MainView} />
			<Route path={`${rootPath}/about`} component={About} />
			<Route path={`${rootPath}/settings`} component={SettingsPage} />
		</Router>
	),
	root!
);
