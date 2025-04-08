import { useParams } from '@solidjs/router';
import { marked } from 'marked';
import {
	BiRegularArrowBack,
	BiRegularPause,
	BiRegularPlay,
} from 'solid-icons/bi';
import { OcCircleslash2 } from 'solid-icons/oc';
import {
	Accessor,
	Component,
	createSignal,
	For,
	Index,
	Match,
	onCleanup,
	onMount,
	Show,
	Switch,
} from 'solid-js';

import Stat from '@/components/utils/Stat';
import { millisToColonFormat } from '@/lib/intl';
import { elapsedMillis, Task } from '@/lib/task';
import { cancelTask, getTask, pauseTask, startTask } from '@/store/task';

import StatusIcon from './StatusIcon';
import StepItem from './StepItem';

type Props = {
	task: Accessor<Task>;
};

const TaskSummaryBody: Component<Props> = (props) => {
	const gotoBack = () => {
		window.history.back();
	};

	return (
		<div>
			<a onClick={gotoBack} class="is-flex my-1">
				<span class="icon">
					<BiRegularArrowBack />
				</span>
				<span>Back</span>
			</a>

			<h2 class="title is-flex gap-1 mb-1">
				<StatusIcon status={props.task().status} />
				{props.task().outline.title}
			</h2>
			<div class="tag">{props.task()._id}</div>
			<Stat
				class="my-2"
				stats={[
					{
						title: 'Status',
						value: props.task().status,
						class: 'is-half',
					},
					{
						title: 'Steps',
						value: `${props.task().steps.length}`,
					},
					{
						title: 'Elapsed',
						value: millisToColonFormat(elapsedMillis(props.task())),
					},
				]}
			/>
		</div>
	);
};

const TaskSummaryDescription: Component<Props> = (props) => {
	const [showDetails, setShowDetails] = createSignal(false);
	return (
		<div class="has-border p-2 my-2 round-1">
			<ul>
				<li>
					<b>Title</b>: {props.task().outline.title}
				</li>
				<li>
					<b>Objective</b>:
					{props.task().outline.objective || 'No objective specified'}
				</li>
				<Switch>
					<Match when={!showDetails()}>
						<a href="#" onClick={() => setShowDetails(true)}>
							Show details
						</a>
					</Match>
					<Match when>
						<li>
							<b>Constraints</b>:
							<div class="multilines">
								{props.task().outline.constraints?.join('\n') ||
									'No constraints specified'}
							</div>
						</li>
						<li>
							<b>Subgoals</b>:
							<div class="multilines">
								{props.task().outline.subgoals?.join('\n') ||
									'No subgoals specified'}
							</div>
						</li>
					</Match>
				</Switch>
			</ul>
		</div>
	);
};

const TaskPageBody: Component<Props> = (props) => {
	return (
		<>
			<TaskSummaryBody task={props.task} />

			<div>
				<Show when={props.task().status === 'pending'}>
					<button
						class="button is-primary"
						onClick={() => startTask(props.task()._id)}
					>
						<BiRegularPlay />
						Start
					</button>
				</Show>
				<Show when={props.task().status === 'running'}>
					<button
						class="button is-warning"
						onClick={() => pauseTask(props.task()._id)}
					>
						<BiRegularPause />
						Pause
					</button>
					<button
						class="button is-danger"
						onClick={() => cancelTask(props.task()._id)}
					>
						<OcCircleslash2 /> Cancel
					</button>
				</Show>
			</div>

			<TaskSummaryDescription task={props.task} />

			<Show when={props.task().outputs}>
				<h3 class="subtitle">Outputs</h3>
				<ul>
					<For each={props.task().outputs}>
						{(text) => (
							<li innerHTML={marked(text, { async: false })} />
						)}
					</For>
				</ul>
			</Show>

			<h3 class="subtitle">Steps (#={props.task().steps.length})</h3>

			<Index each={props.task().steps}>
				{(step, idx) => <StepItem idx={idx} step={step} />}
			</Index>
		</>
	);
};

const TaskSummaryPage: Component = () => {
	const params = useParams<{ id: string }>();
	const taskID = () => params.id;

	const [task, setTask] = createSignal<Task | false | undefined>();

	const reloadTask = async () => {
		const t = await getTask(taskID());
		if (t === undefined) {
			setTask(false);
		} else {
			setTask(t);
		}
	};

	let reloadInterval: number;

	onMount(async () => {
		await reloadTask();
		reloadInterval = window.setInterval(reloadTask, 1000);
	});

	onCleanup(() => {
		window.clearTimeout(reloadInterval);
	});

	return (
		<div class="container">
			<div class="m-2">
				<Switch>
					<Match when={task() === undefined}>
						<p>Loading...</p>
					</Match>
					<Match when={task() === false}>
						<p>Task not found</p>
					</Match>
					<Match when={task() !== undefined && task() !== false}>
						<TaskPageBody task={task as any} />
					</Match>
				</Switch>
			</div>
		</div>
	);
};

export default TaskSummaryPage;
