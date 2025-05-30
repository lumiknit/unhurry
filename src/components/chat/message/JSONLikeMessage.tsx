import { area, bb } from 'billboard.js';
import { default as DOMPurify } from 'dompurify';
import { Component, createSignal, For, Match, onMount, Switch } from 'solid-js';
import { toast } from 'solid-toast';
import 'billboard.js/dist/billboard.min.css';
import 'billboard.js/dist/theme/dark.min.css';

import { copyToClipboard } from '@lib/clipboard';
import hljs from '@lib/hljs';
import { JSONArray, JSONObject, JSONValue } from '@lib/json';

import BlockBottomButtons from './BlockBottomButtons';
import { ItemProps } from './message_types';

type DisplayType =
	| 'fold'
	| 'raw'
	| 'object'
	| 'array'
	| 'table' // Array of objects
	| 'plot'; // Array of numbers, or object with one or two number fields

interface JSONAnalysis {
	// Root types
	isArray: boolean;
	isObject: boolean;

	// Array elements types
	isArrayOfNumbers: boolean;
	isArrayOfObjects: boolean;

	// Array elem fields
	arrayFields: Set<string>;
	arrayNumberFields: Set<string>;

	// Display Types
	displayTypes: DisplayType[];
}

const analyzeJSON = (json: JSONValue): JSONAnalysis => {
	const analysis: JSONAnalysis = {
		isArray: Array.isArray(json),
		isObject: typeof json === 'object' && !Array.isArray(json),
		isArrayOfNumbers: true,
		isArrayOfObjects: true,
		arrayFields: new Set(),
		arrayNumberFields: new Set(),
		displayTypes: ['fold', 'raw'],
	};

	if (analysis.isArray) {
		const array = json as JSONArray;
		if (array.length > 0) {
			array.forEach((item) => {
				const t = typeof item;
				if (t !== 'number') {
					analysis.isArrayOfNumbers = false;
				}
				if (t === 'object' && !Array.isArray(item)) {
					Object.entries(item as JSONObject).forEach(([k, v]) => {
						analysis.arrayFields.add(k);
						if (typeof v === 'number') {
							analysis.arrayNumberFields.add(k);
						}
					});
				} else {
					analysis.isArrayOfObjects = false;
				}
			});
		}
	} else {
		analysis.isArrayOfNumbers = false;
		analysis.isArrayOfObjects = false;
	}

	// Display types
	if (analysis.isObject) {
		analysis.displayTypes.push('object');
	}
	if (analysis.isArray) {
		analysis.displayTypes.push('array');
	}
	if (analysis.isArrayOfNumbers || analysis.arrayNumberFields.size > 0) {
		analysis.displayTypes.push('plot');
	}
	if (analysis.isArrayOfObjects) {
		analysis.displayTypes.push('table');
	}

	return analysis;
};

interface PlotProps {
	analysis: JSONAnalysis;
	data: JSONValue;
}

const Plot: Component<PlotProps> = (props) => {
	let divRef: HTMLDivElement;

	const numFields = Array.from(props.analysis.arrayNumberFields);

	// undefined x = index
	const [xField, setXField] = createSignal<string | undefined>(
		numFields.length >= 2 ? numFields[0] : undefined
	);
	const [yField, setYField] = createSignal<string>(
		numFields.length >= 2 ? numFields[1] : numFields[0]
	);

	const renderPlot = () => {
		let x: number[] = [];
		let y: number[] = [];

		if (props.analysis.isArrayOfNumbers) {
			// The only way is index & value
			y = props.data as unknown as number[];
			x = y.map((_, i) => i);
		} else if (props.analysis.isArrayOfObjects) {
			const array = props.data as unknown as JSONObject[];
			if (xField() === undefined) {
				x = Array.from(array.keys());
			} else {
				const xf = xField();
				x = array.map((obj) => obj[xf!] as number);
			}
			const yf = yField();
			y = array.map((obj) => obj[yf] as number);
		} else {
			throw new Error('Invalid data for plot');
		}

		// Generate plot
		bb.generate({
			bindto: divRef!,
			data: {
				type: area(),
				x: 'x',
				columns: [
					['x', ...x],
					['y', ...y],
				],
			},
		});
	};

	const handleXFieldChange = (e: Event) => {
		const target = e.target as HTMLSelectElement;
		setXField(target.value);
		renderPlot();
	};

	const handleYFieldChange = (e: Event) => {
		const target = e.target as HTMLSelectElement;
		setYField(target.value);
		renderPlot();
	};

	onMount(() => {
		renderPlot();
	});

	return (
		<>
			<div class="field has-addons">
				<p class="control">
					<a class="button is-static">X Axis</a>
				</p>
				<p class="control">
					<span class="select">
						<select onChange={handleXFieldChange}>
							<option value="" selected={xField() === undefined}>
								Index
							</option>
							<For
								each={Array.from(
									props.analysis.arrayNumberFields
								)}
							>
								{(field) => (
									<option
										selected={xField() === field}
										value={field}
									>
										{field}
									</option>
								)}
							</For>
						</select>
					</span>
				</p>
				<p class="control">
					<a class="button is-static">Y Axis</a>
				</p>
				<p class="control">
					<span class="select">
						<select onChange={handleYFieldChange}>
							<For
								each={Array.from(
									props.analysis.arrayNumberFields
								)}
							>
								{(field) => (
									<option
										selected={yField() === field}
										value={field}
									>
										{field}
									</option>
								)}
							</For>
						</select>
					</span>
				</p>
			</div>
			<div>
				<div ref={divRef!}>Plot</div>
			</div>
		</>
	);
};

const JSONLikeMessage: Component<ItemProps> = (props) => {
	/** parsed is parsed json object/array. */
	const [parsed, setParsed] = createSignal<JSONValue>(null);
	const [analysis, setAnalysis] = createSignal<JSONAnalysis | undefined>();
	const [displayType, setDisplayType] = createSignal<DisplayType>('raw');

	const [html, setHtml] = createSignal('');
	// Use highlight.js to highlight code

	onMount(async () => {
		let language = props.type;
		let j: JSONValue = null;
		switch (props.type) {
			case 'json':
				try {
					j = JSON.parse(props.content);
					setParsed(j);
				} catch {
					/* Ignore */
				}
				break;
		}
		setAnalysis(analyzeJSON(j));
		if (hljs.getLanguage(language) === undefined) {
			language = 'plaintext';
		}

		const result = hljs.highlight(props.content, { language });
		setHtml(DOMPurify.sanitize(result.value));
	});

	const handleCopy = () => {
		copyToClipboard(props.content);
		toast.success('Copied to clipboard');
	};

	return (
		<>
			<div class="msg-code">
				<header class="flex-split">
					<span>@{props.type}</span>
					<span>
						<button class="tag is-info ml-1" onClick={handleCopy}>
							Copy
						</button>
						<div class="select is-small">
							<select
								class="ml-1"
								onChange={(e) =>
									setDisplayType(
										e.currentTarget.value as DisplayType
									)
								}
							>
								{analysis()?.displayTypes.map((dt) => (
									<option
										selected={dt === displayType()}
										value={dt}
									>
										{dt}
									</option>
								))}
							</select>
						</div>
					</span>
				</header>
				<Switch>
					<Match when={displayType() === 'raw'}>
						<div innerHTML={html()} />
					</Match>
					<Match when={displayType() === 'object'}>
						<div>
							<table class="table is-striped is-fullwidth">
								<thead>
									<tr>
										<th>Key</th>
										<th>Value</th>
									</tr>
								</thead>
								<tbody>
									<For
										each={Object.entries(
											parsed() as JSONObject
										)}
									>
										{([key, value]) => (
											<tr>
												<td>{key}</td>
												<td>{JSON.stringify(value)}</td>
											</tr>
										)}
									</For>
								</tbody>
							</table>
						</div>
					</Match>
					<Match when={displayType() === 'array'}>
						<div>
							<table class="table is-striped is-fullwidth">
								<thead>
									<tr>
										<th>Index</th>
										<th>Value</th>
									</tr>
								</thead>
								<tbody>
									<For
										each={(parsed() as JSONArray).map(
											(value, index) => ({ index, value })
										)}
									>
										{({ index, value }) => (
											<tr>
												<td>{index}</td>
												<td>{JSON.stringify(value)}</td>
											</tr>
										)}
									</For>
								</tbody>
							</table>
						</div>
					</Match>
					<Match when={displayType() === 'table'}>
						<div>
							<table class="table is-striped is-fullwidth">
								<thead>
									<tr>
										<th>Index</th>
										<For
											each={Array.from(
												analysis()?.arrayFields || []
											)}
										>
											{(field) => <th>{field}</th>}
										</For>
									</tr>
								</thead>
								<tbody>
									<For
										each={(parsed() as JSONObject[]).map(
											(obj, index) => ({ index, obj })
										)}
									>
										{({ index, obj }) => (
											<tr>
												<td>{index}</td>
												<For
													each={Array.from(
														analysis()
															?.arrayFields || []
													)}
												>
													{(field) => (
														<td>
															{JSON.stringify(
																obj[field]
															)}
														</td>
													)}
												</For>
											</tr>
										)}
									</For>
								</tbody>
							</table>
						</div>
					</Match>
					<Match when={displayType() === 'plot'}>
						<Plot analysis={analysis()!} data={parsed()} />
					</Match>
				</Switch>
			</div>
			<BlockBottomButtons
				getContent={() => props.content}
				getLang={() => props.type}
			/>
		</>
	);
};

export default JSONLikeMessage;
