import { Component } from 'solid-js';

import ModelList from './ModelList';

const SettingsPage: Component = () => {
	return (
		<div class="container">
			<h1 class="title is-3">Settings</h1>

			<ModelList />
		</div>
	);
};

export default SettingsPage;
