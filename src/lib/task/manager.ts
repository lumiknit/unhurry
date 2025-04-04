/**
 * @module lib/task/manager
 *
 * This module manage background task runnning.
 */

import { logr } from '../logr';
import { Task } from './structs';

export class TaskManager {
	managerDelayMS: number;
	intervalID: number | null = null;
	runningTasks: Task[];

	constructor() {
		this.managerDelayMS = 50;
	}

	private async checkTask() {}

	start() {
		if (this.intervalID) {
			logr.warn('Task manager is already running');
			return;
		}

		this.intervalID = window.setInterval(() => {
			this.checkTask();
		}, this.managerDelayMS);
	}

	stop() {
		if (this.intervalID) {
			clearInterval(this.intervalID);
			this.intervalID = null;
		} else {
			logr.warn('Task manager is not running');
		}
	}
}
