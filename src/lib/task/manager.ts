/**
 * @module lib/task/manager
 *
 * This module manage background task runnning.
 */

import { MsgPartsParser } from '@/lib/chat';
import { LLMMessage, newClientFromConfig } from '@/lib/llm';
import { getUserConfig } from '@/store';

import { logr } from '../logr';
import { Task, TaskPlan } from './structs';

export type TaskManagerState = {
	running: boolean;
	watchingTasks: number;
};

class RunningTask {
	task: Task;

	cancelled?: boolean;

	constructor(task: Task) {
		this.task = task;
	}
}

/**
 * TaskManager manages background tasks.
 */
export class TaskManager {
	/**
	 * Delay time for the task manager.
	 */
	managerDelayMS: number;

	/**
	 * Manager main loop interval ID.
	 */
	intervalID: number | null = null;

	/**
	 * Task list.
	 * If the task is in this list, the manager will automatically
	 * execute the task and update the status.
	 */
	taskList: Map<string, RunningTask>;

	// Callbacks

	onManagerStatusChange?: (state: TaskManagerState) => void;

	/**
	 * Callback when task status is changed.
	 */
	onTaskUpdate?: (task: Task) => void;

	/**
	 * Injected method to get the task list.
	 */
	getTaskList?: () => Promise<Task[]>;

	constructor() {
		this.managerDelayMS = 500;
		this.taskList = new Map();
	}

	// Callback helpers

	private handleStateUpdate() {
		this.onManagerStatusChange?.({
			running: this.running(),
			watchingTasks: this.taskList.size,
		});
	}

	// Utils

	/**
	 * Generate a task plan from the user's request.
	 */
	async generateTaskPlan(request: string): Promise<TaskPlan> {
		const config = getUserConfig();
		if (!config) {
			throw new Error('No user config');
		}

		const modelConfig = config.models[config.currentModelIdx];
		if (!modelConfig) {
			throw new Error('No model config');
		}

		const llm = newClientFromConfig(modelConfig);
		const systemPrompt = `
You are a task planner.
User will give you a request.
You should generate a task plan from the request.

# Requirements

- Title: Short and clear.
- Objective: The goal of the task. It should describe which output the user wants.
- Subgoals: Steps. Each step describes 'which previous result to use', 'what to do', and 'which output is expected'.
- Constraints: Rules to follow.

- Title should be the same language as the request.
- All other plans should be in English.

- Task will be handled step-by-step. For each step, one or more workers will handle the task simultaneously.
- For each step, worker can generate text as LLM, browsing web, execute js code, etc.
- Each step takes previous restuls, and give a report in text format. Be aware of that.

# Your output format

You should generate your opinion about the user's request,
and then you should give the JSON format of the task plan in code block with the language 'output'.
The JSON format should be like this:

\`\`\`output
{
  "title": "Task title",
  "objective": "The ultimate goal of the task.",
  "subgoals": [
		"step1",
		"step2"
  ]
  "constraints": [
	"The task is divided into subtasks.",
	"Each subtask is a step to achieve the goal."
  ]
}
\`\`\`

Title and objective should be a string, and plan and constraints should be an array of strings.

`.trim();

		const msg = await llm.chat(systemPrompt, [LLMMessage.user(request)]);
		const text = msg.extractText();
		const parts = MsgPartsParser.parse(text);
		console.log('Parts:', parts);
		// Find 'output' part
		const outputPart = parts.find((part) => part.type === 'output');
		if (!outputPart) {
			throw new Error('No output part');
		}
		const plan = JSON.parse(outputPart.content);
		return plan;
	}

	private async checkTask(rt: RunningTask) {
		logr.info('[Task/Manager] Checking task', rt.task._id);
		try {
			const task = rt.task;
			if (rt.cancelled) {
				// TODO: cancel current working LLM
				logr.info('Task cancelled', task._id);
				this.taskList.delete(task._id);
				this.onTaskUpdate?.(task);
				task.status = 'failed';
				task.outputs = ['Cancelled by user'];
				return;
			}
		} catch (e) {
			logr.error(
				'[Task/Manager] Error while checking task',
				rt.task._id,
				e
			);
		}
	}

	private async checkTasks() {
		const ps = [];
		for (const rt of this.taskList.values()) {
			ps.push(this.checkTask(rt));
		}
		await Promise.all(ps);
	}

	/**
	 * Start the task manager loop.
	 */
	start() {
		if (this.intervalID) {
			logr.warn('Task manager is already running');
			return;
		}

		this.intervalID = window.setInterval(() => {
			this.checkTasks();
		}, this.managerDelayMS);

		this.handleStateUpdate();
	}

	/**
	 * Stop the task manager loop.
	 */
	stop() {
		if (this.intervalID) {
			clearInterval(this.intervalID);
			this.intervalID = null;
			this.handleStateUpdate();
		} else {
			logr.warn('Task manager is not running');
		}
	}

	running() {
		return this.intervalID !== null;
	}

	/**
	 * Insert the task into the current task list and run until the task is finished.
	 */
	startTask(task: Task) {
		if (this.taskList.has(task._id)) {
			logr.warn('Task is already running');
			return;
		}

		task.status = 'running';
		this.taskList.set(task._id, new RunningTask(task));
		this.onTaskUpdate?.(task);
	}

	cancelTask(id: string) {
		const rt = this.taskList.get(id);
		if (!rt) {
			logr.warn('Task is not running');
			return;
		}

		rt.cancelled = true;
		logr.info(`Task ${id} cancelled, will be stopped soon.`);
	}
}

/**
 * Task manager instance.
 */
export const taskManager = new TaskManager();
