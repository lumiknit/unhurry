import { TbPlus } from 'solid-icons/tb';
import { For, Setter } from 'solid-js';
import toast from 'solid-toast';

import ModelEditor from './ModelItem';
import { emptyModelConfig, ModelConfig } from '../../lib/llm';
import { getUserConfig, setUserConfig } from '../../store';

const ModelList = () => {
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

	return (
		<div>
			<h2 class="subtitle is-4">Model List ({models().length})</h2>

			<button class="button is-primary is-gap-2" onClick={addModel}>
				<TbPlus />
				Add model
			</button>

			<div class="columns is-multiline">
				<For each={models()}>
					{(m, i) => (
						<div class="column is-4">
							<ModelEditor
								model={m}
								updateModel={updateModel(i())}
								idx={i()}
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
