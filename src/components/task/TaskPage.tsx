import { useParams } from '@solidjs/router';
import { Component, onMount } from 'solid-js';

const TaskPage: Component = () => {
	const params = useParams<{ id: string }>();
	const taskID = () => params.id;

	const task = () => {};

	onMount(() => {
		//TODO: load task from DB
	});

	return (
		<div>
			<h1>Task Page: {taskID()}</h1>
		</div>
	);
};

export default TaskPage;
