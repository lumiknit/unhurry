/**
 * @module lib/task/manager
 *
 * This module manage background task runnning.
 */

import { MsgPart, MsgPartsParser } from '@/lib/chat';
import {
	LLMMessage,
	LLMMessages,
	ModelConfig,
	newClientFromConfig,
} from '@/lib/llm';
import { getUserConfig } from '@/store';

import { logr } from '../logr';
import { SingleTaskAction } from './action_task';
import {
	commitElapsed,
	newStep,
	Step,
	Task,
	TaskOutline,
	taskOutlineToMD,
} from './structs';

// Helpers

const markStepPending = (step: Step) => {
	step.status = 'pending';
	commitElapsed(step);
};

const markStepRunning = (step: Step) => {
	step.status = 'running';
	step.lastStartedAt = new Date();
};

const markStepDone = (
	step: Step,
	status: 'done' | 'failed',
	report: string
) => {
	step.status = status;
	commitElapsed(step);
	step.report = report;
};

/**
 * Task manager's state for share.
 */
export type TaskManagerState = {
	running: boolean;
	watchingTasks: number;
};

/**
 * State class for the current running task.
 */
class RunningTask {
	locked?: boolean;
	/**
	 * Running instance.
	 */
	task: Task;

	/**
	 * Cancelled flag.
	 */
	cancelled?: 'pause' | 'cancel';

	constructor(task: Task) {
		this.task = task;
	}

	tryLock(): boolean {
		if (this.locked) return false;
		this.locked = true;
		return true;
	}

	unlock() {
		this.locked = false;
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
		this.managerDelayMS = 3000;
		this.taskList = new Map();
	}

	// Callback helpers

	private handleStateUpdate() {
		this.onManagerStatusChange?.({
			running: this.running(),
			watchingTasks: this.taskList.size,
		});
	}

	private handleTaskUpdate(task: Task) {
		// Update time
		commitElapsed(task);
		task.lastStartedAt = new Date();
		this.onTaskUpdate?.(task);
	}

	// Utils

	private async getCurrentModelConfig(): Promise<ModelConfig> {
		const config = getUserConfig();
		if (!config) {
			throw new Error('No user config');
		}
		return config.models[config.currentModelIdx];
	}

	/**
	 * Using LLM, generate a next LLM task until some required parts are given.
	 * If the parts is not given, it'll ask again 'then?'
	 * @param checkDone Check the given parts is all of required.
	 * It should returns a function (post-process) if all parts was given.
	 */
	async coerceLLMOnce<T>(
		modelConfig: ModelConfig,
		systemPrompt: string,
		chatHistory: LLMMessages,
		checkDone: (parts: MsgPart[]) => Promise<undefined | (() => Promise<T>)>
	): Promise<undefined | T> {
		const llm = newClientFromConfig(modelConfig);
		if (chatHistory[chatHistory.length - 1]?.role !== 'user') {
			chatHistory.push(
				LLMMessage.user('Then? Please give me code block.')
			);
		}
		const resp = await llm.chat(systemPrompt, chatHistory);
		logr.info('[taskmanager] Coerce In/Out', chatHistory, resp);
		chatHistory.push(resp);
		const parts = MsgPartsParser.parse(resp.extractText());
		const postProcess = await checkDone(parts);
		if (postProcess === undefined) {
			return undefined;
		}
		return await postProcess();
	}

	private async handleCancel(rt: RunningTask): Promise<void> {
		// TODO: cancel current working LLM
		logr.info('Task cancelled', rt.task._id);
		this.taskList.delete(rt.task._id);
		if (rt.cancelled === 'pause') {
			rt.task.status = 'pending';
		} else {
			rt.task.status = 'failed';
			rt.task.outputs = ['Cancelled by user'];
		}
		this.handleTaskUpdate(rt.task);
		this.handleStateUpdate();
	}

	/**
	 * Generate a task plan from the user's request.
	 */
	async generateTaskOutline(request: string): Promise<TaskOutline> {
		const systemPrompt = `
You are a task planner.
User will give you a request.
You should generate a task outline from the reqeust

# Requirements

- Title: Short and clear.
- Objective: The goal of the task. It should describe which output the user wants.
- Subgoals: Steps. Each step describes 'which previous result to use', 'what to do', and 'which output is expected'.
- Constraints: Rules to follow.

- You should use the same language as the user's request.

- Task will be handled step-by-step. For each step, one or more workers will handle the task simultaneously.
- For each step, worker can generate text as LLM, browsing web, execute js code, etc.
- Each step takes previous restuls, and give a report in text format. Be aware of that.

# Your output format

You should generate your opinion about the user's request,
and then you should give the JSON format of the task plan in code block with the language 'task:outline'.
The JSON format should be like this:

\`\`\`task:outline
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

		const chatHistory: LLMMessages = [
			LLMMessage.user('Request: ' + request),
		];
		let result: TaskOutline | undefined;
		do {
			result = await this.coerceLLMOnce(
				await this.getCurrentModelConfig(),
				systemPrompt,
				chatHistory,
				async (parts) => {
					// Find 'output' part
					const outputPart = parts.find(
						(part) => part.type === 'task:outline'
					);
					console.log(parts, outputPart);
					if (!outputPart) {
						return;
					}
					return async () => {
						const plan = JSON.parse(outputPart.content);
						return plan as TaskOutline;
					};
				}
			);
		} while (result === undefined);

		if (result === undefined) {
			throw new Error('Unexpected result');
		}

		return result;
	}

	/**
	 * Generate steps for the task.
	 * If already task is done, it'll finish the task.
	 * Otherwise, it'll push some steps to perform.
	 */
	private async generateSteps(runningTask: RunningTask): Promise<void> {
		const task = runningTask.task;

		const systemPrompt = `
You are a task planner assistant.
You should read ultimate objective, previous step reports,
and plan the next steps to achieve the ultimate goal.

# (IMPORTANT) Output format

You can put any of your thoughts in your answer,
but you should give one of the below markdown code blocks with three special keywords,
'task:done', 'task:next', or 'task:ask'.

## 'task:done'

- If the task is done, you should give 'task:done' block with the answer as follows:

\`\`\`task:done
(The report of the task is done.)
\`\`\`

- For the task report, you should give detailed information / answer.

## 'task:next'

- If you think the task is not done and more operations are needed,
you should give at least one of 'task:next' block with the subtask (goal of step) as follows:

\`\`\`task:next
Analyze the data from websurfing from the google.
- You should use the google web search tools.
- Report only the links from the web search.
\`\`\`

- You can give multiple 'task:next' blocks for concurrent tasks at once.
- For the next step planning, you should give the brief information at the first line,
and then give the detailed information / tool recommendation / constraints in the next lines.

## 'task:ask'

If you think you need some user's opinion or behavior,
you should give 'task:ask' block with the question as follows:

\`\`\`task:ask
What do you think about the result?
Currently, we need some manual work, ...
\`\`\`

- The first line of the block should be short and clear question.
- The next lines should be detailed information / tool recommendation / constraints.

# Notes

- If your answer does not contain any of the above blocks,
  user will ask you 'Then?' for the next step.

# Task Description

The following is the current task which you are working on.

- Title: ${task.outline.title}
- Objective: ${task.outline.objective}
- Constraints: ${task.outline.constraints.join(', ')}
- Subgoals: ${task.outline.subgoals.join(', ')}

# Previous step reports
${task.steps
	.map((step, idx) => {
		return `${idx + 1}. ${step.report}`;
	})
	.join('\n\n')}
		`.trim();

		const partsHandler = async (parts: MsgPart[]) => {
			let done = '';
			const nexts: string[] = [];
			const asks: string[] = [];

			for (const part of parts) {
				switch (part.type) {
					case 'task:done':
						done = part.content.trim();
						break;
					case 'task:next':
						nexts.push(part.content.trim());
						break;
					case 'task:ask':
						asks.push(part.content.trim());
						break;
				}
			}

			if (done) {
				return async () => {
					await this.transitTaskDone(runningTask, done);
					return true;
				};
			} else if (nexts.length > 0 || asks.length > 0) {
				return async () => {
					await this.transitTaskNexts(runningTask, nexts, asks);
					return true;
				};
			} else {
				return;
			}
		};

		const chatHistory: LLMMessages = [];
		let result: boolean | undefined;
		console.log('Try to plan', task._id);
		do {
			result = await this.coerceLLMOnce(
				await this.getCurrentModelConfig(),
				systemPrompt,
				chatHistory,
				partsHandler
			);
			console.log('Result:', result);
		} while (result === undefined);
	}

	/**
	 * Transits the given task to done state.
	 * It'll report based on the details provided.
	 * @param rt The running task to transit.
	 * @param details The details of the task completion.
	 */
	private async transitTaskDone(rt: RunningTask, details: string) {
		rt.task.outputs = [details];
		rt.task.status = 'done';

		this.handleTaskUpdate(rt.task);
	}

	/**
	 * Add further steps and asks to the given task.
	 * @param rt The running task to transit.
	 * @param nextGoals The goals to transit to.
	 * @param asks The asks to transit to.
	 */
	private async transitTaskNexts(
		rt: RunningTask,
		nextGoals: string[],
		asks: string[]
	) {
		// Push steps
		rt.task.steps.push(...nextGoals.map((goal) => newStep('ai', goal)));
		rt.task.steps.push(...asks.map((ask) => newStep('ask', ask)));

		this.handleTaskUpdate(rt.task);
	}

	private async continueStep(rt: RunningTask, idx: number) {
		const task = rt.task;
		const step = task.steps[idx];
		if (!step) {
			throw new Error(`Step ${idx} not found for task ${task._id}`);
		}

		// Pre-process for llm
		markStepRunning(step);
		this.handleTaskUpdate(rt.task);

		const userConfig = getUserConfig();
		if (!userConfig) {
			return;
		}
		const action = new SingleTaskAction(
			userConfig.models,
			userConfig.tools,
			step.chatHistory
		);
		action.taskOutline = taskOutlineToMD(task.outline);
		action.previousSteps = task.steps
			.filter((s) => s.report)
			.map((s) => `#### ${s.goal}\n${s.report}\n`);
		action.currentGoal = step.goal;

		await action.runWithUserMessage([
			{
				type: 'text',
				content: 'Then?',
			},
		]);
		const lastParts =
			step.chatHistory.msgPairs[step.chatHistory.msgPairs.length - 1]
				.assistant?.parts;
		if (lastParts === undefined) {
			logr.error("Chat didn't create assistant message");
			return;
		}
		console.log(lastParts);

		// Find 'task:report'
		const reports: string[] = [];
		for (const part of lastParts) {
			if (part.type === 'task:report') {
				reports.push(part.content);
			}
		}
		const report = reports.join('\n\n');
		if (!report) {
			logr.error('No report found');
			markStepPending(step);
			this.handleTaskUpdate(rt.task);
		} else {
			// Post-process for llm
			markStepDone(step, 'done', report);
			this.handleTaskUpdate(rt.task);
		}
	}

	private async checkTask(rt: RunningTask) {
		if (!rt.tryLock()) {
			// Already someone checking. Just return
			return;
		}
		logr.info('[Task/Manager] Checking task', rt.task._id);
		try {
			const task = rt.task;
			if (rt.cancelled) {
				this.handleCancel(rt);
				return;
			}

			// Find not finished steps
			const pendings: number[] = [];
			const runnings: number[] = [];
			task.steps.forEach((step, idx) => {
				if (step.status === 'pending') {
					pendings.push(idx);
				} else if (step.status === 'running') {
					runnings.push(idx);
				}
			});

			if (runnings.length > 0) {
				// Some task already running, do nothing.
			} else if (pendings.length > 0) {
				// Some steps are still ready, continue
				logr.info(
					`[Task/Manager] Make task ${task._id} step ${pendings[0]} ready`
				);
				await this.continueStep(rt, pendings[0]);
			} else {
				logr.info(
					`[Task/Manager] Task ${task._id} has no pending or running steps, pass to planner`
				);
				await this.generateSteps(rt);
			}
		} catch (e) {
			logr.error(
				'[Task/Manager] Error while checking task',
				rt.task._id,
				e
			);
		}
		rt.unlock();
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
		}

		this.intervalID = window.setInterval(() => {
			this.checkTasks();
		}, this.managerDelayMS);

		this.handleStateUpdate();

		this.loadTaskFromStore();
	}

	async loadTaskFromStore() {
		const tasks = await this.getTaskList?.();
		if (!tasks) {
			logr.warn('Failed to get task list');
			return;
		}
		for (const task of tasks) {
			if (task.status === 'running') {
				task.steps.forEach((step) => {
					if (step.status === 'running') {
						markStepPending(step);
					}
				});
				this.startTask(task);
			}
		}
	}

	/**
	 * Stop the task manager loop.
	 */
	stop() {
		if (!this.intervalID) {
			logr.warn('Task manager is not running');
		}
		clearInterval(this.intervalID!);
		this.intervalID = null;
		this.handleStateUpdate();
	}

	/**
	 * @returns True if the task manager is running.
	 */
	running() {
		return this.intervalID !== null;
	}

	/**
	 * Start a task.
	 * It'll push the task in the managed list, and process with interval.
	 * @param task Task to start
	 * @returns True if the task was started successfully.
	 * If the task is already running, it will return false.
	 */
	startTask(task: Task): boolean {
		if (this.taskList.has(task._id)) {
			logr.warn('Task is already running');
			return false;
		}

		task.status = 'running';
		this.taskList.set(task._id, new RunningTask(task));
		this.handleTaskUpdate(task);
		this.handleStateUpdate();
		return true;
	}

	/**
	 * Pause the task with the given ID.
	 * @param id Task ID to pause
	 */
	pauseTask(id: string) {
		const rt = this.taskList.get(id);
		if (!rt) {
			logr.warn('Task is not running');
			return;
		}

		rt.cancelled = 'pause';
		logr.info(`Task ${id} paused, will be stopped soon.`);
	}

	/**
	 * Cancel the task with the given ID.
	 * @param id Task ID to cancel
	 */
	cancelTask(id: string) {
		const rt = this.taskList.get(id);
		if (!rt) {
			logr.warn('Task is not running');
			return;
		}

		rt.cancelled = 'cancel';
		logr.info(`Task ${id} cancelled, will be stopped soon.`);
	}
}

/**
 * Task manager instance.
 */
export const taskManager = new TaskManager();
