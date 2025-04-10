import { Component, createSignal, For, onCleanup, onMount } from 'solid-js';

import { logr, LogItem } from '@/lib/logr';

const LogsPage: Component = () => {
	let interval: number;

	const [logs, setLogs] = createSignal<LogItem[]>([], {
		equals: (a, b) => a.length === b.length,
	});

	onMount(() => {
		setLogs(logr.items);
		interval = window.setInterval(() => {
			setLogs(logr.items);
		}, 2000);
	});

	onCleanup(() => {
		clearInterval(interval);
	});

	return (
		<div class="container">
			<h1 class="title">Logs</h1>
			<ul class="is-family-monospace">
				<For each={logs()}>
					{(log) => (
						<li>
							[
							<strong>
								{new Date(log.timestamp).toLocaleString()}
							</strong>
							]&nbsp;
							<strong>{log.level}</strong>&nbsp;
							{log.message}
						</li>
					)}
				</For>
			</ul>
		</div>
	);
};

export default LogsPage;
