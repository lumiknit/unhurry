import { Component } from 'solid-js';

import { getMemoryConfig, setMemoryConfig } from '@/store/config';

import NumForm from './form/NumForm';
import SwitchForm from './form/SwitchForm';
import TextareaForm from './form/TextareaForm';

const MemorySettings: Component = () => {
	return (
		<>
			<h4 class="title is-4">Memory</h4>

			<SwitchForm
				label="Enable Memory"
				desc="Enable memory. NOTE: This will run LLM in the background for every chat!"
				get={() => !!getMemoryConfig()?.enabled}
				set={(value: boolean) =>
					setMemoryConfig((s) => {
						if (!s) return s;
						return { ...s, enabled: value };
					})
				}
			/>

			<NumForm
				label="Size Limit"
				desc="Number of sentences to keep in memory. If 0, unlimited."
				min={0}
				max={100}
				step={1}
				get={() => getMemoryConfig()?.maxSize || 0}
				set={(value: number) =>
					setMemoryConfig((s) => {
						if (!s) return s;
						return { ...s, maxFacts: value };
					})
				}
			/>

			<TextareaForm
				label="Memory Prompt"
				desc="Prompt to use for memory"
				rows={8}
				get={() => (getMemoryConfig()?.contents || []).join('\n')}
				set={(value: string) =>
					setMemoryConfig((s) => {
						if (!s) return s;
						return { ...s, contents: value.split('\n') };
					})
				}
			/>
		</>
	);
};

export default MemorySettings;
