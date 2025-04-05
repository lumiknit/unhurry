import { Component } from 'solid-js';

import { taskManager } from '@/lib/task/manager';
import { taskStore } from '@/store/task';

const TaskManagerState: Component = () => {
	const toggleManager = () => {
		if (taskStore.state.running) {
			taskManager.stop();
		} else {
			taskManager.start();
		}
	};

	return (
		<div>
			<h2 class="title"> Task Manager</h2>

			<div class="columns mb-2">
				<div class="column">
					<div class="card">
						<div class="card-content">
							{taskStore.state.running
								? 'running'
								: 'not running'}

							<button
								class="button is-small is-primary ml-2"
								onClick={toggleManager}
							>
								{taskStore.state.running ? 'Stop' : 'Start'}{' '}
								Manager
							</button>
						</div>
					</div>
				</div>

				<div class="column">
					<div class="card">
						<div class="card-content">
							Managed Tasks: {taskStore.state.watchingTasks}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TaskManagerState;
