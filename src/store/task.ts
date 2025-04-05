import { createStore } from 'solid-js/store';

import { taskListTx } from '@/lib/idb';
import { Task, TaskPlan } from '@/lib/task';
import { taskManager, TaskManagerState } from '@/lib/task/manager';
import { uniqueID } from '@/lib/utils';

type TaskStore = {
	state: TaskManagerState;
};

export const [taskStore, setTaskStore] = createStore<TaskStore>({
	state: {
		running: false,
		watchingTasks: 0,
	},
});

taskManager.onTaskUpdate = async (task) => {
	// Store the task changes into the task list.
	const tx = await taskListTx<Task>();
	task.updatedAt = new Date();
	await tx.put(task);
};

taskManager.onManagerStatusChange = (state) => {
	setTaskStore('state', 'running', state.running);
};

/**
 * Create a task and push to the task list.
 */
export const createTask = async (
	taskPlan: TaskPlan,
	start?: boolean
): Promise<string> => {
	const task: Task = {
		_id: uniqueID(),
		createdAt: new Date(),
		updatedAt: new Date(),
		lastCheckedAt: new Date(0),
		status: 'pending',
		plan: taskPlan,
		steps: [],
	};

	const tx = await taskListTx<Task>();
	await tx.put(task);

	if (start) {
		taskManager.startTask(task);
	}

	return task._id;
};

export const getTask = async (taskID: string): Promise<Task | undefined> => {
	const tx = await taskListTx<Task>();
	const task = await tx.get(taskID);
	if (!task) {
		return undefined;
	}
	return task;
};

export const getAllTasks = async (): Promise<Task[]> => {
	const tx = await taskListTx<Task>();
	const tasks = await tx.getAll();
	return tasks;
};
