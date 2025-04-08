import { A } from '@solidjs/router';
import {
	BiRegularCalendar,
	BiRegularDotsHorizontalRounded,
	BiRegularPlus,
	BiRegularTime,
	BiSolidWrench,
} from 'solid-icons/bi';
import { Component, createSignal, For, onMount, Show } from 'solid-js';
import toast from 'solid-toast';

import { rootPath } from '@/env';
import { millisToColonFormat, shortRelativeDateFormat } from '@/lib/intl';
import { elapsedMillis, Task } from '@/lib/task';
import { taskManager } from '@/lib/task/manager';
import { deleteTask, getAllTasks, taskStore } from '@/store/task';

import StatusIcon from './StatusIcon';
import { openConfirm } from '../modal-confirm';
import Stat from '../utils/Stat';

const TaskManagerToggleButton: Component = () => {
	const msg = () => (taskStore.state.running ? 'Running' : 'Stopped');
	const cls = () => (taskStore.state.running ? 'is-primary' : 'is-danger');
	return (
		<button
			class={'button has-text-weight-bold ' + cls()}
			onClick={() => {
				if (taskStore.state.running) {
					taskManager.stop();
				} else {
					taskManager.start();
				}
			}}
		>
			<span class="icon mr-1">
				<BiSolidWrench />
			</span>
			{msg()}
		</button>
	);
};

type ItemProps = {
	task: Task;

	onReload?: () => void;
};

const TaskListItem: Component<ItemProps> = (props) => {
	const [showDropdown, setShowDropdown] = createSignal(false);

	const handleDelete = async () => {
		if (
			!(await openConfirm('Are you sure you want to delete this task?'))
		) {
			return;
		}
		toast.promise(deleteTask(props.task._id), {
			loading: 'Deleting task...',
			success: 'Task deleted successfully',
			error: 'Failed to delete task',
		});
		props.onReload?.();
	};

	return (
		<a class="panel-block panel-item">
			<StatusIcon class="panel-item-icon" status={props.task.status} />
			<A
				class="panel-item-content has-text-default"
				href={`${rootPath}/tasks/${props.task._id}`}
			>
				<div class="panel-item-body">
					<div class="panel-item-title">
						{props.task.outline.title}
					</div>
					<div class="panel-item-desc">
						{props.task.outline.objective}
					</div>
				</div>
				<div class="panel-item-date">
					<div>
						<BiRegularCalendar />
						{shortRelativeDateFormat(props.task.createdAt)}
					</div>
					<div>
						<BiRegularTime />{' '}
						{millisToColonFormat(elapsedMillis(props.task))}
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
							<a
								href="#"
								class="dropdown-item has-text-danger"
								onClick={handleDelete}
							>
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
				<Stat
					class="mb-2"
					stats={[
						{
							title: 'Manager',
							value: TaskManagerToggleButton,
							props: {},
						},
						{
							title: 'Watching',
							value: `${taskStore.state.watchingTasks}`,
						},
					]}
				/>
				<nav class="panel">
					<p class="panel-block has-background-text-soft has-text-weight-bold flex-split">
						Tasks
						<A
							class="button is-small is-primary"
							href={`${rootPath}/task/new`}
						>
							<span class="icon mr-1">
								<BiRegularPlus />
							</span>
							New Task
						</A>
					</p>
					<For each={tasks()}>
						{(task) => (
							<TaskListItem task={task} onReload={reloadTasks} />
						)}
					</For>
				</nav>
			</div>
		</div>
	);
};

export default TaskListPage;
