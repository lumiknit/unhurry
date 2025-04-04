import { BiRegularMeteor } from 'solid-icons/bi';
import { IoSparkles } from 'solid-icons/io';
import { Component } from 'solid-js';

const TaskCreatePage: Component = () => {
	const handleGenerate = () => {};

	return (
		<div class="container">
			<div class="m-2">
				<h2 class="title">Create a New Task</h2>

				<div class="field">
					<label class="label">Request</label>
					<textarea
						class="textarea"
						placeholder="Enter your request here..."
					/>
					<p class="help">
						Based on the request, AI will fill the below form.
					</p>
				</div>

				<button class="button is-primary" onClick={handleGenerate}>
					<span class="icon mr-1">
						<IoSparkles />
					</span>
					Generate
				</button>

				<hr />

				<div class="field">
					<label class="label">Title</label>
					<input type="text" class="input" />
				</div>

				<div class="field">
					<label class="label">Objective</label>
					<textarea class="textarea" />
				</div>

				<div class="field">
					<label class="label">Plan</label>
					<textarea class="textarea" />
				</div>

				<div class="field">
					<label class="label">Constraints</label>
					<textarea class="textarea" />
				</div>

				<button class="button is-primary" onClick={handleGenerate}>
					<span class="icon mr-1">
						<BiRegularMeteor />
					</span>
					Start Task
				</button>
			</div>
		</div>
	);
};

export default TaskCreatePage;
