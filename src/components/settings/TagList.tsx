import { TbPlus } from 'solid-icons/tb';
import { Component, For } from 'solid-js';
import { toast } from 'solid-toast';

import {
	Color,
	colors,
	colorSet,
	PromptTag,
	PromptTagAction,
	promptTagActions,
} from '../../lib/config';
import { getUserConfig, setUserConfig } from '../../store';

type TagProps = {
	idx: number;
	promptTag: PromptTag;
	onChange: (tag: PromptTag) => void;
	onDelete: (idx: number) => void;
	onMoveUp: (idx: number) => void;
	onMoveDown: (idx: number) => void;
};

const Tag: Component<TagProps> = (props) => {
	let nameRef: HTMLInputElement;
	let colorRef: HTMLSelectElement;
	let actionRef: HTMLSelectElement;
	let promptRef: HTMLTextAreaElement;

	const handleChange = () => {
		const color = colorRef!.value as Color;
		if (!colorSet.has(color)) {
			toast.error('Invalid color');
			return;
		}

		const action = actionRef!.value as PromptTagAction;
		if (!new Set(promptTagActions).has(action)) {
			toast.error('Invalid action');
			return;
		}

		props.onChange({
			...props.promptTag,
			tag: nameRef!.value,
			color,
			action,
			prompt: promptRef!.value,
		});
	};

	return (
		<div class="card">
			<div class="card-content">
				<div class="field">
					<label class="label">Tag</label>
					<div class="control">
						<input
							class="input"
							type="text"
							value={props.promptTag.tag}
							ref={nameRef!}
							onChange={handleChange}
						/>
					</div>
				</div>
				<div class="field">
					<label class="label">Color</label>
					<div class="control">
						<div
							class={
								'select is-fullwidth is-' +
								props.promptTag.color
							}
						>
							<select
								value={props.promptTag.color}
								ref={colorRef!}
								onChange={handleChange}
							>
								<For each={colors}>
									{(color) => (
										<option value={color}>{color}</option>
									)}
								</For>
							</select>
						</div>
					</div>
				</div>
				<div class="field">
					<label class="label">Action</label>
					<div class="control">
						<div class="select is-fullwidth">
							<select
								value={props.promptTag.action}
								ref={actionRef!}
								onChange={handleChange}
							>
								<For each={promptTagActions}>
									{(action) => (
										<option value={action}>{action}</option>
									)}
								</For>
							</select>
						</div>
					</div>
				</div>
				<div class="field">
					<label class="label">Prompt</label>
					<div class="control">
						<textarea
							class="textarea"
							value={props.promptTag.prompt}
							ref={promptRef!}
							onChange={handleChange}
						/>
					</div>
				</div>
			</div>
			<footer class="card-footer">
				<a
					href="#"
					class="card-footer-item"
					onClick={() => props.onDelete(props.idx)}
				>
					Delete
				</a>
				<a
					href="#"
					class="card-footer-item"
					onClick={() => props.onMoveUp(props.idx)}
				>
					Move Up
				</a>
				<a
					href="#"
					class="card-footer-item"
					onClick={() => props.onMoveDown(props.idx)}
				>
					Move Down
				</a>
			</footer>
		</div>
	);
};

const TagList: Component = () => {
	const handleAddTag = () => {
		const tag: PromptTag = {
			tag: 'New Tag',
			color: 'none',
			action: 'insert',
			prompt: 'Hello! ',
		};
		setUserConfig((c) => ({
			...c,
			promptTags: [tag, ...c.promptTags],
		}));
	};

	const handleChange = (idx: number) => (tag: PromptTag) => {
		setUserConfig((c) => {
			const newTags = [...c.promptTags];
			newTags[idx] = tag;
			return { ...c, promptTags: newTags };
		});
	};

	const handleDeleteTag = (idx: number) => {
		if (!confirm(`Delete tag ${getUserConfig()?.promptTags[idx].tag}?`))
			return;
		setUserConfig((c) => ({
			...c,
			promptTags: c.promptTags.filter((_, i) => i !== idx),
		}));
		toast.success('Tag deleted');
	};
	const handleMoveUpTag = (idx: number) => {
		if (idx === 0) return;
		setUserConfig((c) => {
			const newTags = [...c.promptTags];
			[newTags[idx - 1], newTags[idx]] = [newTags[idx], newTags[idx - 1]];
			return { ...c, promptTags: newTags };
		});
		toast.success('Tag moved up');
	};

	const handleMoveDownTag = (idx: number) => {
		setUserConfig((c) => {
			if (idx === c.promptTags.length - 1) return c;
			const newTags = [...c.promptTags];
			[newTags[idx + 1], newTags[idx]] = [newTags[idx], newTags[idx + 1]];
			return { ...c, promptTags: newTags };
		});
		toast.success('Tag moved down');
	};

	return (
		<div>
			<h2 class="title is-4">Tag List</h2>

			<p> Your preset prompts here. </p>

			<div>
				<button
					class="button is-small is-primary is-gap-1"
					onClick={handleAddTag}
				>
					<TbPlus />
					Add tag
				</button>
			</div>

			<div>
				<For each={getUserConfig()?.promptTags}>
					{(tag, idx) => (
						<Tag
							idx={idx()}
							promptTag={tag}
							onChange={handleChange(idx())}
							onDelete={handleDeleteTag}
							onMoveUp={handleMoveUpTag}
							onMoveDown={handleMoveDownTag}
						/>
					)}
				</For>
			</div>
		</div>
	);
};

export default TagList;
