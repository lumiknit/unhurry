import { useNavigate } from '@solidjs/router';
import { BiRegularMeteor, BiRegularPlus } from 'solid-icons/bi';
import { IoSparkles } from 'solid-icons/io';
import { Component } from 'solid-js';
import { toast } from 'solid-toast';

import { rootPath } from '@/env';
import { logr } from '@/lib/logr';
import { TaskOutline } from '@/lib/task';
import { taskManager } from '@/lib/task/manager';
import { createTask } from '@/store/task';

const TaskCreatePage: Component = () => {
	const navigate = useNavigate();

	let userRequestRef: HTMLTextAreaElement | undefined;

	let taskTitleRef: HTMLInputElement | undefined;
	let taskObjectiveRef: HTMLTextAreaElement | undefined;
	let taskSubgoalsRef: HTMLTextAreaElement | undefined;
	let taskConstraintsRef: HTMLTextAreaElement | undefined;

	const handleGenerate = async () => {
		const userRequest = userRequestRef?.value;
		if (!userRequest) {
			toast.error('Please enter a request.');
			return;
		}

		const pm = (async () => {
			const plan: TaskOutline =
				await taskManager.generateTaskOutline(userRequest);
			if (!plan) {
				toast.error('Failed to generate task plan.');
				return;
			}
			taskTitleRef!.value = plan.title;
			taskObjectiveRef!.value = plan.objective;
			taskSubgoalsRef!.value = plan.subgoals.join('\n');
			taskConstraintsRef!.value = plan.constraints.join('\n');
		})();

		toast.promise(pm, {
			loading: 'Generating task plan...',
			success: 'Task plan generated successfully.',
			error: (e) => {
				logr.error(e);
				return 'Failed to generate task plan.';
			},
		});
	};

	const handleCreate = async (start?: boolean) => {
		const plan: TaskOutline = {
			title: taskTitleRef!.value,
			objective: taskObjectiveRef!.value,
			subgoals: taskSubgoalsRef!.value.split('\n'),
			constraints: taskConstraintsRef!.value.split('\n'),
		};

		const id = await createTask(plan, start);

		toast.success(
			`Task created successfully. ID: ${id}. ${start ? 'Starting...' : ''}`
		);

		navigate(`${rootPath}/tasks/${id}`);
	};

	return (
		<div class="container">
			<div class="m-2">
				<h2 class="title">Create a New Task</h2>

				<div class="field">
					<label class="label">Request</label>
					<textarea
						ref={userRequestRef}
						class="textarea"
						placeholder="Enter your request here..."
					/>
					<p class="help">
						Based on the request, AI will fill the below form.
					</p>
				</div>

				<button class="button is-primary" onClick={handleGenerate}>
					<span class="icon mr-1">
						<IoSparkles />
					</span>
					Generate
				</button>

				<hr />

				<div class="field">
					<label class="label">Title</label>
					<input ref={taskTitleRef} type="text" class="input" />
				</div>

				<div class="field">
					<label class="label">Objective</label>
					<textarea ref={taskObjectiveRef} class="textarea" />
				</div>

				<div class="field">
					<label class="label">Subgoals</label>
					<textarea ref={taskSubgoalsRef} class="textarea" />
				</div>

				<div class="field">
					<label class="label">Constraints</label>
					<textarea ref={taskConstraintsRef} class="textarea" />
				</div>

				<div>
					<button
						class="button is-primary mr-1"
						onClick={() => handleCreate(false)}
					>
						<span class="icon mr-1">
							<BiRegularPlus />
						</span>
						Create Task
					</button>
					<button
						class="button is-warning"
						onClick={() => handleCreate(true)}
					>
						<span class="icon mr-1">
							<BiRegularMeteor />
						</span>
						Start Task
					</button>
				</div>
				<p class="help">
					'Create Task' will just create a task, not start it.
				</p>
			</div>
		</div>
	);
};

export default TaskCreatePage;
