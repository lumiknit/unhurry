import { A } from '@solidjs/router';
import {
	BiRegularCalendar,
	BiRegularDotsHorizontalRounded,
	BiRegularTime,
} from 'solid-icons/bi';
import { IoSparkles } from 'solid-icons/io';
import { Component, createSignal, For, Show } from 'solid-js';

import { rootPath } from '@/env';
import { shortRelativeDateFormat } from '@/lib/intl';

import StatusIcon from './StatusIcon';

type ItemProps = {
	status: 'pending' | 'running' | 'done' | 'failed';
	id: string;
	title: string;
	message: string;
	createdAt: Date;
	updatedAt: Date;
};

const TaskListItem: Component<ItemProps> = (props) => {
	const [showDropdown, setShowDropdown] = createSignal(false);

	return (
		<div class="panel-block panel-item">
			<StatusIcon class="panel-item-icon" status={props.status} />
			<div class="panel-item-content">
				<div class="panel-item-body">
					<A
						href={`${rootPath}/tasks/${props.id}`}
						class="panel-item-title"
					>
						{props.title}
					</A>
					<div class="panel-item-desc">{props.message}</div>
				</div>
				<div class="panel-item-date">
					<div>
						<BiRegularCalendar />
						{shortRelativeDateFormat(props.createdAt)}
					</div>
					<div>
						<BiRegularTime /> 1:23
					</div>
				</div>
			</div>
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
		</div>
	);
};

const TaskListPage: Component = () => {
	const exampleItems: ItemProps[] = [
		{
			id: 'a',
			status: 'running',
			title: 'Task 1',
			message: 'This is a test task',
			createdAt: new Date(Date.now() - 1000 * 60 * 8),
			updatedAt: new Date(),
		},
		{
			id: 'b',
			status: 'failed',
			title: 'Task 1',
			message: 'This is a test task',
			createdAt: new Date(Date.now() - 1000 * 60 * 3),
			updatedAt: new Date(),
		},
		{
			id: 'c',
			status: 'done',
			title: 'Simple one, but what is your purpose?',
			message: 'What is going on. Hello',
			createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
			updatedAt: new Date(),
		},
	];

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
					<For each={exampleItems}>
						{(item) => <TaskListItem {...item} />}
					</For>
				</nav>
			</div>
		</div>
	);
};

export default TaskListPage;
