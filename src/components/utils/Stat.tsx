import { Component, For, Match, Switch } from 'solid-js';

export type StatItem<T extends Record<string, any>> = {
	title: string;
	value: string | Component<T>;
	props?: T;

	class?: string;
};

const Item: Component<StatItem<any>> = (props) => {
	return (
		<div class={'column ' + (props.class || '')}>
			<div class="is-size-7">{props.title}</div>
			<Switch>
				<Match when={typeof props.value === 'function'}>
					<div class="is-size-5 has-text-weight-bold">
						{(props.value as Component)(props.props!)}
					</div>
				</Match>
				<Match when>
					<div class="is-size-5 has-text-weight-bold">
						{props.value as string}
					</div>
				</Match>
			</Switch>
		</div>
	);
};

type Props = {
	stats: StatItem<any>[];
	class?: string;
};

const Stat: Component<Props> = (props) => {
	return (
		<div class={'has-border px-3 py-2 round-1 ' + (props.class || '')}>
			<div class="columns is-mobile">
				<For each={props.stats}>{(stat) => <Item {...stat} />}</For>
			</div>
		</div>
	);
};

export default Stat;
