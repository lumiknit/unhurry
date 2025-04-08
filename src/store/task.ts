import { createStore } from 'solid-js/store';
import { toast } from 'solid-toast';

import { taskListTx } from '@/lib/idb';
import { Task, TaskOutline } from '@/lib/task';
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
	setTaskStore('state', state);
};

/**
 * Create a task and push to the task list.
 */
export const createTask = async (
	outline: TaskOutline,
	start?: boolean
): Promise<string> => {
	const task: Task = {
		_id: uniqueID(),
		createdAt: new Date(),
		lastCheckedAt: new Date(0),
		status: 'pending',
		outline: outline,
		artifacts: [],
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

taskManager.getTaskList = getAllTasks;

export const startTask = async (taskID: string) => {
	const task = await getTask(taskID);
	if (!task) {
		throw new Error(`Task ${taskID} not found`);
	}
	taskManager.startTask(task);
	toast.success(`Task ${taskID} starts soon`);
};

export const pauseTask = async (taskID: string) => {
	taskManager.pauseTask(taskID);
	toast.success(`Task ${taskID} paused`);
};

export const cancelTask = async (taskID: string) => {
	taskManager.cancelTask(taskID);
	toast.success(`Task ${taskID} canceled`);
};

export const deleteTask = async (taskID: string): Promise<void> => {
	taskManager.cancelTask(taskID);

	const tx = await taskListTx<Task>();
	await tx.delete(taskID);
};
