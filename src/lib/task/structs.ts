import { ChatHistory } from '../chat';
import { ToolConfigs } from '../config/tool';

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
	 * LLM Model ID
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

export type ProcessStatus = 'pending' | 'running' | 'done' | 'failed';

export type ProcessResult = 'done' | 'cancelled' | 'failed';

// StepItem

export type StepItemResult = {
	status: ProcessResult;

	report: string;

	finishedAt: Date;
};

/**
 * StepItem is a atomic unit of a step.
 * Each step item can be run independently, concurrently.
 *
 */
export type StepItem = {
	/**
	 * The goal of this step item.
	 */
	goal: string;

	/**
	 * The timestamp when this step item was created.
	 */
	startedAt: Date;

	history: ChatHistory;

	result?: StepItemResult;
};

// Step

export type StepResult = {
	status: ProcessResult;

	report: string;

	finishedAt: Date;
};

export type Step = {
	createdAt: Date;

	goal: string;

	items: StepItem[];

	result?: StepResult;
};

// Task

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
	 * Task status.
	 */
	status: ProcessStatus;

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
	 * The task is divided into subtasks.
	 * Each subtask is a step to achieve the goal.
	 */
	constraints: string[];

	/**
	 * Each
	 */
	subgoals: string[];
};
