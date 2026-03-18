import { batch, Component, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { openConfirm } from '@/components/modal';
import { getUserConfig, setUserConfig } from '@/state/config';

import { defaultModelConfig, ModelConfig } from '@lib/config';

import ItemList from './ItemList';
import ModelItem from './ModelItem';

const ModelList: Component = () => {
	const models = () => getUserConfig()?.models || [];

	const editingIdx = () => getUserConfig()?.currentModelIdx || 0;
	const setEditingIdx = (v: number) =>
		setUserConfig((c) => ({ ...c, currentModelIdx: v }));

	const modelLabel = (m: ModelConfig) => {
		const provider = getUserConfig()?.providers.find(
			(p) => p.id === m.providerId
		);
		if (m.name) return m.name;
		if (provider) return `${provider.name} / ${m.model}`;
		return m.model || '(unnamed)';
	};

	const addModel = () => {
		setUserConfig((c) => ({
			...c,
			models: [...(c?.models || []), defaultModelConfig()],
		}));
		setEditingIdx(models().length - 1);
		toast.success('Model added');
	};

	const updateModel = (idx: number) => (m: ModelConfig) => {
		setUserConfig((c) => {
			const next = [...c.models];
			next[idx] = m;
			return { ...c, models: next };
		});
	};

	const deleteModel = async (idx: number) => {
		const label = modelLabel(models()[idx]);
		if (!(await openConfirm(`Delete model "${label}"?`))) return;
		setUserConfig((c) => {
			const next = [...c.models];
			next.splice(idx, 1);
			return { ...c, models: next };
		});
		toast.success(`Model deleted`);
	};

	const handleMove = (idx: number, delta: number) => {
		const tgt = idx + delta;
		if (tgt < 0 || tgt >= models().length) return;
		batch(() => {
			setUserConfig((c) => {
				const next = [...c.models];
				const [removed] = next.splice(idx, 1);
				next.splice(tgt, 0, removed);
				return { ...c, models: next };
			});
			setEditingIdx(tgt);
		});
	};

	return (
		<div>
			<h2 class="title is-4">Models ({models().length})</h2>

			<p>
				Order matters for fallback — when a model fails (e.g. 429), the
				next one is tried.
			</p>

			<div class="mb-2" />

			<ItemList
				items={models().map((m) => ({
					label: modelLabel(m),
					color: 'primary',
				}))}
				selected={editingIdx()}
				onSelect={setEditingIdx}
				onAdd={addModel}
			/>

			<Show when={models()[editingIdx()]}>
				<ModelItem
					model={models()[editingIdx()]}
					idx={editingIdx()}
					onUpdate={updateModel(editingIdx())}
					onMoveUp={() => handleMove(editingIdx(), -1)}
					onMoveDown={() => handleMove(editingIdx(), 1)}
					onDelete={() => deleteModel(editingIdx())}
				/>
			</Show>
		</div>
	);
};

export default ModelList;
