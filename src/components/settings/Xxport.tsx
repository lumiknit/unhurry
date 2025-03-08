import { Component, createEffect } from 'solid-js';
import { toast } from 'solid-toast';

import { copyToClipboard } from '../../lib/clipboard';
import { getUserConfig, setUserConfig } from '../../store';

const Xxport: Component = () => {
	let urlRef: HTMLInputElement;
	let taRef: HTMLTextAreaElement;

	const importText = (text: string) => {
		try {
			const c = JSON.parse(text);
			setUserConfig(c);
			toast.success('Config imported');
		} catch (e) {
			console.error('failed to import config', e);
			toast.error('Failed to import config');
		}
	};

	const importFromURL = async () => {
		const url = urlRef!.value;
		const res = await fetch(url);
		if (!res.ok) {
			console.error('failed to fetch', res);
			toast.error('Failed to fetch');
			return;
		}

		const text = await res.text();
		importText(text);
	};

	const importFromTextarea = () => {
		importText(taRef!.value);
	};

	const handleCopy = () => {
		copyToClipboard(taRef!.value);
	};

	createEffect(() => {
		const c = getUserConfig();
		if (c) {
			taRef!.value = JSON.stringify(c, null, 2);
		}
	});

	return (
		<>
			<h2 class="title is-4">Import from URL</h2>
			<p>
				Enter your settings JSON URL (e.g. gist) and click 'import'
				button.
			</p>

			<div class="field is-grouped is-align-content-stretch">
				<p class="control is-expanded">
					<input
						ref={urlRef!}
						type="text"
						class="input"
						placeholder="URL"
					/>
				</p>
				<p class="control">
					<button class="button is-danger" onClick={importFromURL}>
						Import
					</button>
				</p>
			</div>

			<h2 class="title is-4">Import / Export from Text</h2>
			<div>
				<button class="button is-danger" onClick={importFromTextarea}>
					Import
				</button>
				<button class="button is-primary" onClick={handleCopy}>
					Copy
				</button>
			</div>

			<textarea ref={taRef!} class="textarea" />
		</>
	);
};

export default Xxport;
