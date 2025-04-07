import { useParams } from '@solidjs/router';
import { BiRegularArrowBack } from 'solid-icons/bi';
import { Component, createSignal, For, Match, onMount, Switch } from 'solid-js';

import { Task } from '@/lib/task';
import { getTask } from '@/store/task';

import StatusIcon from './StatusIcon';
import Stat from '../utils/Stat';

type Props = {
	task: Task;
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
				<StatusIcon status={props.task.status} />
				{props.task.plan.title}
			</h2>
			<div class="tag">{props.task._id}</div>
			<Stat
				class="my-2"
				stats={[
					{
						title: 'Status',
						value: props.task.status,
						class: 'is-half',
					},
					{
						title: 'Steps',
						value: `${props.task.steps.length}`,
					},
					{
						title: 'Elapsed',
						value: '1:23',
					},
				]}
			/>
		</div>
	);
};

const TaskSummaryDescription: Component<Props> = (props) => {
	return (
		<div class="has-border p-2 my-2 round-1">
			<ul>
				<li>
					<b>Title</b>: {props.task.plan.title}
				</li>
				<li>
					<b>Objective</b>:
					{props.task.plan.objective || 'No objective specified'}
				</li>
				<li>
					<b>Constraints</b>:
					{props.task.plan.constraints?.join(', ') ||
						'No constraints specified'}
				</li>
				<li>
					<b>Subgoals</b>:
					{props.task.plan.subgoals?.join(', ') ||
						'No subgoals specified'}
				</li>
			</ul>
		</div>
	);
};

const TaskPageBody: Component<Props> = (props) => {
	return (
		<>
			<TaskSummaryBody task={props.task} />

			<TaskSummaryDescription task={props.task} />

			<h3 class="subtitle">Steps (#={props.task.steps.length})</h3>

			<For each={props.task.steps}>
				{(step, idx) => (
					<div class="has-border p-2 my-2 round-1">Step {idx()}</div>
				)}
			</For>
		</>
	);
};

const TaskSummaryPage: Component = () => {
	const params = useParams<{ id: string }>();
	const taskID = () => params.id;

	const [task, setTask] = createSignal<Task | false | undefined>();

	onMount(async () => {
		const t = await getTask(taskID());
		if (t === undefined) {
			setTask(false);
		} else {
			setTask(t);
		}
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
						<TaskPageBody task={task() as Task} />
					</Match>
				</Switch>
			</div>
		</div>
	);
};

export default TaskSummaryPage;
