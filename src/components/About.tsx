import { BiLogosGithub } from 'solid-icons/bi';
import { Component, createSignal, onMount, Show } from 'solid-js';
import { toast } from 'solid-toast';

import logo from '@/assets/unhurry.svg';
import { openConfirm } from '@/components/modal';
import { logr } from '@/lib/logr';
import { resetAllData } from '@/lib/reset';

import { getBEService, IBEService } from '../lib/be';

import './About.scss';

/**
 * Compare two version strings.
 * Each version should be in the format of "x.y.z".
 */
const compareVersion = (a: string, b: string): number => {
	// Split version strings into num arrays
	const aNums = a.split('.').map((n) => parseInt(n));
	const bNums = b.split('.').map((n) => parseInt(n));
	for (let i = 0; i < Math.min(aNums.length, bNums.length); i++) {
		if (aNums[i] > bNums[i]) {
			return 1;
		} else if (aNums[i] < bNums[i]) {
			return -1;
		}
	}
	return aNums.length - bNums.length;
};

/**
 * Get the latest release version.
 */
const getLatestRelease = async (): Promise<string | void> => {
	const resp = await fetch(
		'https://api.github.com/repos/lumiknit/unhurry/releases/latest'
	);
	if (resp.ok) {
		interface RespBody {
			assets_url: string;
			created_at: string;
			name: string;
			tag_name: string;
			html_url: string;
		}
		const j: RespBody = await resp.json();
		let name = j.name;
		if (name.startsWith('v')) {
			name = name.slice(1);
		}
		return name;
	}
};

/**
 * About page. (/about)
 */
const About: Component = () => {
	const [, setBE] = createSignal<IBEService | void>();
	const [platform, setPlatform] = createSignal<string>('web');
	const [latestRelease, setLatestRelease] = createSignal<
		string | undefined
	>();
	const link = 'https://github.com/lumiknit/unhurry';
	const latestReleaseURL = link + '/releases/latest';

	// Load BE service to display
	onMount(async () => {
		const be = await getBEService();
		setBE(be);
		(window as { _be?: unknown })._be = be;
		logr.info('[About] BE service loaded', be?.name());

		if (be) {
			const platform = await be.platform();
			setPlatform(platform);
		}
	});

	// Load latest release version
	onMount(async () => {
		const r = await getLatestRelease();
		if (r) {
			setLatestRelease(r);
		}
	});

	const handleReset = async () => {
		if (await openConfirm('Are you sure to reset all data?')) {
			await resetAllData();
			toast.success('All data has been reset.');
		}
	};

	return (
		<div class="container">
			<div class="has-text-centered">
				<h1 class="title"> About Unhurry </h1>
				<img class="unhurry-icon" src={logo} />
				<p>
					<b>Unhurry</b> is a front-end only LLM Web UI for quick and
					ease uses.
				</p>
				<ul>
					<li>
						<b>Author</b>:{' '}
						<a target="_blank" href="https://github.com/lumiknit">
							lumiknit (aasr4r4@gmail.com)
						</a>
					</li>
					<li class="is-inline-flex is-align-items-center">
						<b>Repository</b>:{' '}
						<a class="button is-dark" href={link} target="_blank">
							<BiLogosGithub /> &nbsp; lumiknit/unhurry
						</a>
					</li>
				</ul>

				<br />

				<p>
					<b>Platform</b>: {platform()}
				</p>

				<p>
					<b>Version</b>: {PACKAGE_VERSION}
				</p>

				<br />

				<Show when={latestRelease()}>
					<p>
						<b>Latest Version</b>: {latestRelease()}
						<Show
							when={
								compareVersion(
									PACKAGE_VERSION,
									latestRelease()!
								) < 0
							}
						>
							<span class="tag is-primary ml-1">
								New Version!
							</span>
						</Show>
					</p>
				</Show>

				<a target="_blank" href={latestReleaseURL}>
					Visit the latest release page
				</a>

				<br />

				<p>
					If your data is corrupted or you want to reset all data, you
					can reset all data here.
				</p>
				<button class="button is-danger" onClick={handleReset}>
					Reset All Data
				</button>
			</div>
		</div>
	);
};

export default About;
