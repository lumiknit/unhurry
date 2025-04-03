import { useParams } from '@solidjs/router';
import { Component } from 'solid-js';

const TaskPage: Component = () => {
	const params = useParams<{ id: string }>();
	const taskID = () => params.id;

	return (
		<div>
			<h1>Task Page: {taskID()}</h1>
		</div>
	);
};

export default TaskPage;
