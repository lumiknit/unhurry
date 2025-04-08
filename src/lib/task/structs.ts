import { ChatHistory } from '../chat';
import { ToolConfigs } from '../config/tool';

/**
 * Process status.
 *
 * - Pending: Not started yet.
 * - Running: In progress.
 * - Done: Completed.
 * - Failed: Failed to complete.
 * - Interrupted: Stopped by user.
 */
export type ProcessStatus =
	| 'pending'
	| 'running'
	| 'done'
	| 'failed'
	| 'interrupted';

export interface WithElapsed {
	elapsedMillis?: number;
	lastStartedAt?: Date;
}

export const elapsedMillis = (we: WithElapsed): number => {
	let millis = we.elapsedMillis || 0;
	if (we.lastStartedAt !== undefined) {
		millis += Date.now() - we.lastStartedAt.getTime();
	}
	return millis;
};

export const commitElapsed = (we: WithElapsed): number => {
	we.elapsedMillis = elapsedMillis(we);
	we.lastStartedAt = undefined;
	return we.elapsedMillis;
};

/**
 * TaskForce is a group of agents to achieve a task.
 */
export interface TaskForce {
	/**
	 * TaskForce ID
	 */
	id: string;

	/**
	 * TaskForce name
	 */
	name: string;

	/**
	 * Available models for this task force
	 */
	modelID: string;

	/**
	 * Tool options
	 */
	toolConfigs: ToolConfigs;

	/**
	 * System prompt for planner
	 */
	plannerSystemPrompt: string;

	/**
	 * System prompt for worker
	 */
	workerSystemPrompt: string;
}

/**
 * Step of task
 */
export type Step = WithElapsed & {
	/**
	 * ask: User should solve this problem
	 * ai: AI will handling automatically
	 */
	type: 'ask' | 'ai';

	status: ProcessStatus;

	goal: string;

	chatHistory: ChatHistory;

	report?: string;
};

export const newStep = (type: 'ask' | 'ai', goal: string): Step => {
	return {
		type,
		status: 'pending',
		elapsedMillis: 0,
		goal,
		chatHistory: {
			msgPairs: [],
		},
	};
};

// Task

/**
 * Outline of the task.
 * TaskOutline is used for
 * - To share draft via functions
 * - Saved in task
 */
export type TaskOutline = {
	/**
	 * Task title
	 */
	title: string;

	/**
	 * The ultimate goal of the task.
	 * The planner will check this goal and create a plan to achieve it.
	 */
	objective: string;

	/**
	 * Subgoals are the intermediate goals of the task.
	 * The planner will check these goals and create a plan to achieve them.
	 */
	subgoals: string[];

	/**
	 * The task is divided into subtasks.
	 * Each subtask is a step to achieve the goal.
	 */
	constraints: string[];
};

/**
 * Task is a kind of 'work' of AI.
 * User's request becomes a task, and AI plan and solve it .
 */
export type Task = WithElapsed & {
	/**
	 * Task ID
	 */
	_id: string;

	/**
	 * Task created date
	 */
	createdAt: Date;

	/**
	 * Task updated date
	 */
	updatedAt: Date;

	/**
	 * Last timestamp when user checked the task.
	 * This is used to notify the user.
	 */
	lastCheckedAt: Date;

	/**
	 * Task outline.
	 * This can be considered as a draft of the task.
	 */
	outline: TaskOutline;

	/**
	 * Task status.
	 */
	status: ProcessStatus;

	/**
	 * Steps for tasks.
	 */
	steps: Step[];

	/**
	 * Artifact list.
	 * This may be the uploaded file from the User,
	 * Or AI generated ones.
	 */
	artifacts: string[];

	/**
	 * Outputs of the whole task.
	 */
	outputs?: string[];
};
