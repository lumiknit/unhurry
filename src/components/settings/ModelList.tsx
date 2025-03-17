import { TbPlus } from 'solid-icons/tb';
import { Component, For, Setter } from 'solid-js';
import { toast } from 'solid-toast';

import ModelEditor from './ModelItem';
import { emptyModelConfig, ModelConfig } from '../../lib/llm';
import { getUserConfig, setUserConfig } from '../../store';

const ModelList: Component = () => {
	const models = () => getUserConfig()?.models || [];

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

	const deleteModel = (idx: number) => {
		const name = models()[idx].name;
		// Confirm
		if (!confirm(`Delete model ${name}?`)) return;
		setUserConfig((c) => {
			const models = [...c.models];
			models.splice(idx, 1);
			return { ...c, models };
		});
		toast.success(`Model ${name} deleted`);
	};

	const handleMove = (idx: number, dir: number) => {
		if (idx + dir < 0 || idx + dir >= models().length) return;
		setUserConfig((c) => {
			const models = [...c.models];
			[models[idx], models[idx + dir]] = [models[idx + dir], models[idx]];
			return { ...c, models };
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
