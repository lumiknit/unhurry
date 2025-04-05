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

export type Step = {
	status: ProcessStatus;

	createdAt: Date;

	updatedAt: Date;

	goal: string;

	chatHistory: ChatHistory;

	report?: string;
};

// Task

export type TaskPlan = {
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
	 * Each
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
export type Task = {
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
	 * Task plan
	 */
	plan: TaskPlan;

	/**
	 * Task status.
	 */
	status: ProcessStatus;

	/**
	 * Steps
	 */
	steps: Step[];

	/**
	 * Outputs
	 */
	outputs?: string[];
};
