import { useParams } from '@solidjs/router';
import { Component, onMount } from 'solid-js';

const TeamPage: Component = () => {
	const params = useParams<{ id: string }>();
	const taskID = () => params.id;

	onMount(() => {
		//TODO: load task from DB
	});

	return (
		<div>
			<h1>Team Page</h1>
		</div>
	);
};

export default TeamPage;
