import { batch, Component, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { configStore, setConfigStore } from '@/features/settings/store';
import { openConfirm } from '@/shared/modal';

import { defaultModelConfig, ModelConfig } from '@lib/config';

import ItemList from './ItemList';
import ModelItem from './ModelItem';

const ModelList: Component = () => {
	const models = () => configStore.models || [];

	const editingIdx = () => configStore.currentModelIdx || 0;
	const setEditingIdx = (v: number) => setConfigStore('currentModelIdx', v);

	const modelLabel = (m: ModelConfig) => {
		const provider = configStore.providers.find(
			(p) => p.id === m.providerId
		);
		if (m.name) return m.name;
		if (provider) return `${provider.name} / ${m.model}`;
		return m.model || '(unnamed)';
	};

	const addModel = () => {
		setConfigStore('models', [
			...(configStore.models || []),
			defaultModelConfig(),
		]);
		setEditingIdx(models().length - 1);
		toast.success('Model added');
	};

	const updateModel = (idx: number) => (m: ModelConfig) => {
		const next = [...configStore.models];
		next[idx] = m;
		setConfigStore('models', next);
	};

	const deleteModel = async (idx: number) => {
		const label = modelLabel(models()[idx]);
		if (!(await openConfirm(`Delete model "${label}"?`))) return;
		const next = [...configStore.models];
		next.splice(idx, 1);
		setConfigStore('models', next);
		toast.success(`Model deleted`);
	};

	const handleMove = (idx: number, delta: number) => {
		const tgt = idx + delta;
		if (tgt < 0 || tgt >= models().length) return;
		batch(() => {
			const next = [...configStore.models];
			const [removed] = next.splice(idx, 1);
			next.splice(tgt, 0, removed);
			setConfigStore('models', next);
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
