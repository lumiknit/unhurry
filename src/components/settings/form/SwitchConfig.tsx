import { Component } from 'solid-js';

import { UserConfig } from '@/lib/config';
import { getUserConfig, setUserConfig } from '@/store';

import SwitchForm from './SwitchForm';

interface Props {
	key: keyof UserConfig;
	label: string;
	desc: string;
}

const SwitchConfig: Component<Props> = (props) => {
	return (
		<SwitchForm
			{...props}
			get={() => !!getUserConfig()?.[props.key]}
			set={(v) => setUserConfig((s) => ({ ...s, [props.key]: v }))}
		/>
	);
};

export default SwitchConfig;
