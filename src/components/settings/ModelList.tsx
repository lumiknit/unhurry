import { batch, Component, Setter, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { openConfirm } from '@/components/modal';
import { getUserConfig, setUserConfig } from '@/store/config';

import { emptyModelConfig, ModelConfig } from '@lib/llm';

import ItemList from './ItemList';
import ModelEditor from './ModelItem';

const ModelList: Component = () => {
	const models = () => getUserConfig()?.models || [];

	const editingIdx = () => getUserConfig()?.currentModelIdx || 0;
	const setEditingIdx = (v: number) =>
		setUserConfig((c) => ({ ...c, currentModelIdx: v }));

	const addModel = () => {
		setUserConfig((c) => ({
			...c,
			models: [...(c?.models || []), emptyModelConfig()],
		}));
		setEditingIdx(models().length - 1);
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

	const handleMove = (idx: number, delta: number) => {
		const tgt = idx + delta;
		if (tgt < 0 || tgt >= models().length) return;
		batch(() => {
			setUserConfig((c) => {
				const models = [...c.models];
				const [removed] = models.splice(idx, 1);
				models.splice(tgt, 0, removed);
				return { ...c, models };
			});
			setEditingIdx(tgt);
		});
	};

	return (
		<div>
			<h2 class="title is-4">Model List ({models().length})</h2>

			<p>
				For fallback, <i>order may be matter</i>. When some model is not
				available (e.g. Too many requests), the next model in the list
				will be used.
			</p>

			<ItemList
				items={models().map((m) => ({
					label: m.name,
					color: 'primary',
				}))}
				selected={editingIdx()}
				onSelect={setEditingIdx}
				onAdd={addModel}
			/>

			<Show when={models()[editingIdx()]}>
				<ModelEditor
					model={models()[editingIdx()]}
					updateModel={updateModel(editingIdx())}
					idx={editingIdx()}
					onMoveUp={() => handleMove(editingIdx(), -1)}
					onMoveDown={() => handleMove(editingIdx(), 1)}
					onDelete={() => deleteModel(editingIdx())}
				/>
			</Show>
		</div>
	);
};

export default ModelList;
