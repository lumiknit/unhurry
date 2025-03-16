import { Component, createSignal, Match, onMount, Switch } from 'solid-js';

import './About.scss';
import { getBEService, IBEService } from '../lib/be';

const About: Component = () => {
	const [be, setBE] = createSignal<IBEService | void>(undefined);
	const link = 'https://github.com/lumiknit/unhurry';

	onMount(async () => {
		const be = await getBEService();
		setBE(be);
	});

	return (
		<div class="container">
			<div class="text-center">
				<h1 class="title"> About Unhurry </h1>
				<img class="unhurry-icon" src="/unhurry.svg" />
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
					<Match when={be() === undefined}>
						<p>
							<b>Platform</b>: Web Browser
						</p>
					</Match>
					<Match when={be()?.name() === 'Tauri'}>
						<p>
							<b>Platform</b>: Desktop (with Tauri)
						</p>
					</Match>
				</Switch>
			</div>
		</div>
	);
};

export default About;
