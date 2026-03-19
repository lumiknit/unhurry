import { Component } from 'solid-js';

import { configStore, setConfigStore } from '@/features/settings/store';
import { UserConfig } from '@/lib/config';

import SelectForm from './SelectForm';

interface Props {
	key: keyof UserConfig;
	label: string;
	desc: string;
	options: { value: string; label: string }[];
}

const SelectConfig: Component<Props> = (props) => {
	return (
		<SelectForm
			{...props}
			get={() => String(configStore[props.key] || '')}
			set={(v) => {
				setConfigStore(props.key as any, v as any);
			}}
		/>
	);
};

export default SelectConfig;
