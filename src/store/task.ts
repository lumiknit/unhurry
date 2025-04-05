import { taskListTx } from '@/lib/idb';
import { Task, TaskPlan } from '@/lib/task';
import { taskManager } from '@/lib/task/manager';
import { uniqueID } from '@/lib/utils';

taskManager.onTaskUpdate = async (task) => {
	// Store the task changes into the task list.
	const tx = await taskListTx<Task>();
	task.updatedAt = new Date();
	await tx.put(task);
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

export const getAllTasks = async (): Promise<Task[]> => {
	const tx = await taskListTx<Task>();
	const tasks = await tx.getAll();
	return tasks;
};
