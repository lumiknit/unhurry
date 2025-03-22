import { TbPlus } from 'solid-icons/tb';
import { batch, Component, createSignal, For, Setter } from 'solid-js';
import { toast } from 'solid-toast';

import { emptyModelConfig, ModelConfig } from '@lib/llm';

import { getUserConfig, setUserConfig } from '@store';

import ModelEditor from './ModelItem';
import { openConfirm } from '../modal-confirm';

const ModelList: Component = () => {
	const models = () => getUserConfig()?.models || [];
	const [editings, setEditings] = createSignal<boolean[]>([]);

	const addModel = () => {
		setUserConfig((c) => ({
			...c,
			models: [emptyModelConfig(), ...(c?.models || [])],
		}));
		toast.success('Model added');
	};

	const updateModel =
		(idx: number): Setter<ModelConfig> =>
		(v) => {
			setUserConfig((c) => {
				const models = [...c.models];
				if (typeof v === 'function') models[idx] = v(models[idx]);
				else models[idx] = v;
				return { ...c, models };
			});
		};

	const deleteModel = async (idx: number) => {
		const name = models()[idx].name;
		// Confirm
		if (!(await openConfirm(`Delete model ${name}?`))) return;
		setUserConfig((c) => {
			const models = [...c.models];
			models.splice(idx, 1);
			return { ...c, models };
		});
		toast.success(`Model ${name} deleted`);
	};

	const handleMove = (idx: number, dir: number) => {
		if (idx + dir < 0 || idx + dir >= models().length) return;
		batch(() => {
			setUserConfig((c) => {
				const models = [...c.models];
				[models[idx], models[idx + dir]] = [
					models[idx + dir],
					models[idx],
				];
				return { ...c, models };
			});
			setEditings((es) => {
				const newEs = [...es];
				[newEs[idx], newEs[idx + dir]] = [newEs[idx + dir], newEs[idx]];
				return newEs;
			});
		});
	};

	return (
		<div>
			<h2 class="title is-4">
				Model List ({models().length})
				<button
					class="button is-small is-primary is-gap-1 ml-2"
					onClick={addModel}
				>
					<TbPlus />
					Add model
				</button>
			</h2>

			<p>
				For fallback, <i>order may be matter</i>. When some model is not
				available (e.g. Too many requests), the next model in the list
				will be used.
			</p>

			<div class="columns is-multiline">
				<For each={models()}>
					{(m, i) => (
						<div class="column is-4">
							<ModelEditor
								model={m}
								editing={editings()[i()]}
								setEditing={(v) =>
									setEditings((es) => {
										const newEs = [...es];
										newEs[i()] = v;
										return newEs;
									})
								}
								updateModel={updateModel(i())}
								idx={i()}
								onMoveUp={() => handleMove(i(), -1)}
								onMoveDown={() => handleMove(i(), 1)}
								onDelete={() => deleteModel(i())}
							/>
						</div>
					)}
				</For>
			</div>
		</div>
	);
};

export default ModelList;
