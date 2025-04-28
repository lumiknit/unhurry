import {
	BiRegularLeftArrow,
	BiRegularRightArrow,
	BiRegularTrash,
} from 'solid-icons/bi';
import { Component, createSignal, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { openConfirm } from '@/components/modal';

import {
	Color,
	colors,
	defaultPromptTag,
	PromptTag,
	PromptTagAction,
	promptTagActions,
	PromptTagShowCondition,
	promptTagShowConditions,
} from '@lib/config';

import { getUserConfig, setUserConfig } from '@store';

import SelectForm from './form/SelectForm';
import SwitchForm from './form/SwitchForm';
import TextForm from './form/TextForm';
import ItemList from './ItemList';

interface TagProps {
	idx: number;
	promptTag: PromptTag;
	onChange: (tag: PromptTag) => void;
	onDelete: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
}

const Tag: Component<TagProps> = (props) => {
	return (
		<>
			<div class="mb-4" />

			<h4 class="title is-4">
				{props.idx + 1}. {props.promptTag.tag}
			</h4>

			<div class="has-text-right mb-4">
				<button class="button is-primary mr-2" onClick={props.onMoveUp}>
					<BiRegularLeftArrow />
				</button>
				<button
					class="button is-primary mr-2"
					onClick={props.onMoveDown}
				>
					<BiRegularRightArrow />
				</button>
				<button class="button is-danger" onClick={props.onDelete}>
					<BiRegularTrash />
					Delete
				</button>
			</div>

			<TextForm
				label="Name"
				desc="Tag name"
				controlClass="flex-1 maxw-75"
				get={() => props.promptTag.tag}
				set={(name) =>
					props.onChange({ ...props.promptTag, tag: name })
				}
			/>

			<SelectForm
				label="Color"
				desc="Tag color"
				options={colors.map((c) => ({ value: c, label: c }))}
				selectClass={'is-' + props.promptTag.color}
				get={() => props.promptTag.color}
				set={(color) =>
					props.onChange({
						...props.promptTag,
						color: color as Color,
					})
				}
			/>

			<SelectForm
				label="Action"
				desc="How prompt is inserted"
				options={promptTagActions.map((action) => ({
					value: action,
					label: action,
				}))}
				get={() => props.promptTag.action}
				set={(action) =>
					props.onChange({
						...props.promptTag,
						action: action as PromptTagAction,
					})
				}
			/>

			<SelectForm
				label="Show Condition"
				desc="When tag is shown"
				options={promptTagShowConditions.map((action) => ({
					value: action,
					label: action,
				}))}
				get={() =>
					(props.promptTag.showCondition || 'always') as string
				}
				set={(action) =>
					props.onChange({
						...props.promptTag,
						showCondition: action as PromptTagShowCondition,
					})
				}
			/>

			<TextForm
				label="Show Condition Param"
				desc="Parameter for the show condition"
				controlClass="flex-1 maxw-75"
				placeholder="comma separated list"
				get={() => props.promptTag.showConditionParam || ''}
				set={(showConditionParam) =>
					props.onChange({
						...props.promptTag,
						showConditionParam,
					})
				}
			/>

			<SwitchForm
				label="Send Immediately"
				desc="Send the message when tag is clicked."
				get={() => !!props.promptTag.sendImmediately}
				set={(sendImmediately) =>
					props.onChange({
						...props.promptTag,
						sendImmediately,
					})
				}
			/>

			<div class="field">
				<label class="label">Prompt</label>
				<div class="control">
					<textarea
						class="textarea"
						value={props.promptTag.prompt}
						onChange={(e) =>
							props.onChange({
								...props.promptTag,
								prompt: e.currentTarget.value,
							})
						}
					/>
				</div>
			</div>
		</>
	);
};

const TagList: Component = () => {
	const [editingIdx, setEditingIdx] = createSignal<number>(0);

	const handleAddTag = () => {
		const tag: PromptTag = defaultPromptTag();
		setUserConfig((c) => ({
			...c,
			promptTags: [...c.promptTags, tag],
		}));
		setEditingIdx(getUserConfig()!.promptTags.length - 1);
	};

	const handleChange = (idx: number) => (tag: PromptTag) => {
		setUserConfig((c) => {
			const newTags = [...c.promptTags];
			newTags[idx] = tag;
			return { ...c, promptTags: newTags };
		});
	};

	const handleDeleteTag = async (idx: number) => {
		if (
			!(await openConfirm(
				`Delete tag ${getUserConfig()?.promptTags[idx].tag}?`
			))
		)
			return;
		setUserConfig((c) => ({
			...c,
			promptTags: c.promptTags.filter((_, i) => i !== idx),
		}));
		toast.success('Tag deleted');
	};

	const handleMoveTag = (idx: number, delta: number) => {
		const c = getUserConfig();
		if (!c) return;

		const newIdx = idx + delta;
		if (newIdx < 0 || newIdx >= c.promptTags.length) {
			toast.error('Invalid move');
			return;
		}

		setUserConfig((c) => {
			const newTags = [...c.promptTags];
			[newTags[newIdx], newTags[idx]] = [newTags[idx], newTags[newIdx]];
			return { ...c, promptTags: newTags };
		});
		setEditingIdx(newIdx);
	};

	return (
		<div>
			<h2 class="title is-4">
				Tag List ({getUserConfig()?.promptTags.length})
			</h2>

			<p> Your preset prompts here. </p>

			<div class="mb-4" />

			<ItemList
				items={(getUserConfig()?.promptTags || []).map((m) => ({
					label: m.tag,
					color: m.color,
				}))}
				selected={editingIdx()}
				onSelect={setEditingIdx}
				onAdd={handleAddTag}
			/>

			<Show when={getUserConfig()?.promptTags[editingIdx()]}>
				<Tag
					idx={editingIdx()}
					promptTag={getUserConfig()!.promptTags[editingIdx()]}
					onChange={handleChange(editingIdx())}
					onDelete={() => handleDeleteTag(editingIdx())}
					onMoveUp={() => handleMoveTag(editingIdx(), -1)}
					onMoveDown={() => handleMoveTag(editingIdx(), 1)}
				/>
			</Show>
		</div>
	);
};

export default TagList;
