import { Component, Match, Switch } from 'solid-js';

import './About.scss';

const About: Component = () => {
	const link = 'https://github.com/lumiknit/unhurry';
	return (
		<div class="container">
			<div class="text-center">
				<h1 class="title"> About Unhurry </h1>
				<img class="unhurry-icon" src="/icon.svg" />
				<p>
					<b>Unhurry</b> is a front-end only LLM Web UI for quick and
					ease uses.
				</p>
				<ul>
					<li>
						<b>Author</b>:{' '}
						<a href="https://github.com/lumiknit">
							lumiknit (aasr4r4@gmail.com)
						</a>
					</li>
					<li>
						<b>Repository</b>: <a href={link}>{link}</a>
					</li>
					<li>
						<b>Version</b>: 0.1.0
					</li>
				</ul>

				<Switch>
					<Match when={(window as any).__TAURI_INTERNALS__}>
						<p>
							<b>Platform</b>: Desktop (with Tauri)
						</p>
					</Match>
					<Match when>
						<p>
							<b>Platform</b>: Web Browser
						</p>
					</Match>
				</Switch>
			</div>
		</div>
	);
};

export default About;
