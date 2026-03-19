import { Component } from 'solid-js';

import { UserConfig } from '@/lib/config';
import { configStore, setConfigStore } from '@/features/settings/store';

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
			get={() => !!configStore[props.key]}
			set={(v) => setConfigStore(props.key as any, v as any)}
		/>
	);
};

export default SwitchConfig;
