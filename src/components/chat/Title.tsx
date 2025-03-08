import { Component, createSignal, Match, Switch } from 'solid-js';

import { getChatContext, setChatContext } from '../../store';

type EditProps = {
	originalTitle: string;
	onSave: (title: string) => void;
};

const TitleEdit: Component<EditProps> = (props) => {
	let titleInputRef: HTMLInputElement;

	const handleKeyUp = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			props.onSave(titleInputRef!.value);
		}
	};

	return (
		<div class="field has-addons">
			<div class="control is-expanded">
				<input
					ref={titleInputRef!}
					class="input"
					type="text"
					placeholder={props.originalTitle || '<untitled>'}
					onKeyUp={handleKeyUp}
				/>
			</div>
			<div class="control">
				<button
					class="button is-success"
					onClick={() => props.onSave(titleInputRef!.value)}
				>
					Save
				</button>
			</div>
		</div>
	);
};

const Title = () => {
	const [editing, setEditing] = createSignal(false);

	const toggleEditing = () => setEditing(!editing());

	return (
		<Switch>
			<Match when={editing()}>
				<TitleEdit
					originalTitle={getChatContext().title}
					onSave={(title) => {
						setChatContext((c) => ({ ...c, title }));
						toggleEditing();
					}}
				/>
			</Match>
			<Match when>
				<h1 class="title is-3">
					<Switch>
						<Match when={getChatContext().title}>
							{getChatContext().title}
						</Match>
						<Match when>
							<i>untitled</i>
						</Match>
					</Switch>

					<button class="tag" onClick={toggleEditing}>
						Edit
					</button>
				</h1>
			</Match>
		</Switch>
	);
};

export default Title;
