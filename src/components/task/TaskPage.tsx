import { useParams } from '@solidjs/router';
import { Component, createSignal, Match, onMount, Switch } from 'solid-js';

import { Task } from '@/lib/task';
import { getTask } from '@/store/task';

type Props = {
	task: Task;
};

const TaskPageBody: Component<Props> = (props) => {
	return (
		<>
			<h2 class="title">{props.task.plan.title}</h2>

			<h3 class="subtitle">Description</h3>

			<ul>
				<li>
					{' '}
					<b>Title</b>: {props.task.plan.title}
				</li>
				<li>
					{' '}
					<b>Objective</b>:{' '}
					{props.task.plan.objective || 'No objective specified'}
				</li>
				<li>
					{' '}
					<b>Constraints</b>:{' '}
					{props.task.plan.constraints?.join(', ') ||
						'No constraints specified'}
				</li>
				<li>
					{' '}
					<b>Subgoals</b>:{' '}
					{props.task.plan.subgoals?.join(', ') ||
						'No subgoals specified'}
				</li>
			</ul>

			<h3 class="subtitle">Status: {props.task.status}</h3>

			<h3 class="subtitle">Steps (#={props.task.steps.length})</h3>
		</>
	);
};

const TaskPage: Component = () => {
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
	);
};

export default TaskPage;
