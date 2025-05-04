import { TbSparkles } from 'solid-icons/tb';
import { Component, createSignal, Match, Switch } from 'solid-js';
import { toast } from 'solid-toast';

import { logr } from '@/lib/logr';
import { generateChatTitle, setTitle } from '@/store/global_actions';
import { getChatContext } from '@/store/store';

interface EditProps {
	originalTitle: string;
	onSave: (title: string) => void;
}

const TitleEdit: Component<EditProps> = (props) => {
	let titleInputRef: HTMLInputElement;

	const handleKeyUp = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			props.onSave(titleInputRef!.value);
		}
	};

	const handleAIGenerate = async () => {
		await toast.promise(generateChatTitle(), {
			loading: 'Generating...',
			success: 'Generated',
			error: (e) => {
				logr.error(e);
				return 'Failed to generate';
			},
		});
	};

	return (
		<div class="field has-addons">
			<div class="control">
				<button class="button is-primary" onClick={handleAIGenerate}>
					<TbSparkles />
				</button>
			</div>

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

	const handleTitleUpdate = (title: string) => {
		toggleEditing();
		setTitle(title);
	};

	return (
		<Switch>
			<Match when={editing()}>
				<TitleEdit
					originalTitle={getChatContext().title}
					onSave={handleTitleUpdate}
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

					<button class="ml-1 tag" onClick={toggleEditing}>
						Edit
					</button>
				</h1>
			</Match>
		</Switch>
	);
};

export default Title;
