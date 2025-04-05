import { A } from '@solidjs/router';
import {
	BiRegularCalendar,
	BiRegularDotsHorizontalRounded,
	BiRegularTime,
} from 'solid-icons/bi';
import { IoSparkles } from 'solid-icons/io';
import { Component, createSignal, For, onMount, Show } from 'solid-js';

import { rootPath } from '@/env';
import { shortRelativeDateFormat } from '@/lib/intl';
import { Task } from '@/lib/task';
import { getAllTasks } from '@/store/task';

import StatusIcon from './StatusIcon';

type ItemProps = {
	task: Task;
};

const TaskListItem: Component<ItemProps> = (props) => {
	const [showDropdown, setShowDropdown] = createSignal(false);

	return (
		<a class="panel-block panel-item">
			<StatusIcon class="panel-item-icon" status={props.task.status} />
			<A
				class="panel-item-content has-text-default"
				href={`${rootPath}/tasks/${props.task._id}`}
			>
				<div class="panel-item-body">
					<div class="panel-item-title">{props.task.plan.title}</div>
					<div class="panel-item-desc">
						{props.task.plan.objective}
					</div>
				</div>
				<div class="panel-item-date">
					<div>
						<BiRegularCalendar />
						{shortRelativeDateFormat(props.task.createdAt)}
					</div>
					<div>
						<BiRegularTime /> 1:23
					</div>
				</div>
			</A>
			<div
				class={
					'h-full dropdown is-right' +
					(showDropdown() ? ' is-active' : '')
				}
			>
				<div class="dropdown-trigger">
					<button
						class="p-2 h-full"
						aria-haspopup="true"
						aria-controls="dropdown-menu"
						onClick={() => setShowDropdown(!showDropdown())}
					>
						<BiRegularDotsHorizontalRounded />
					</button>
				</div>

				<Show when={showDropdown()}>
					<div class="dropdown-menu" id="dropdown-menu" role="menu">
						<div class="dropdown-content">
							<a href="#" class="dropdown-item has-text-danger">
								Delete
							</a>
						</div>
					</div>
				</Show>
			</div>
		</a>
	);
};

const TaskListPage: Component = () => {
	const [tasks, setTasks] = createSignal<Task[]>([]);

	const reloadTasks = async () => {
		const tasks = await getAllTasks();
		setTasks(tasks);
	};

	onMount(reloadTasks);

	return (
		<div class="container">
			<div class="m-2">
				<nav class="panel">
					<p class="panel-block has-background-text-soft has-text-weight-bold flex-split">
						Tasks
						<A
							class="button is-small is-primary"
							href={`${rootPath}/task/new`}
						>
							<span class="icon mx-1">
								<IoSparkles />
							</span>
							Start New Task
						</A>
					</p>
					<For each={tasks()}>
						{(task) => <TaskListItem task={task} />}
					</For>
				</nav>
			</div>
		</div>
	);
};

export default TaskListPage;
