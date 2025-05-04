import { Component } from 'solid-js';

import { UserConfig } from '@/lib/config';
import { getUserConfig, setUserConfig } from '@/store/config';

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
			get={() => String(getUserConfig()?.[props.key] || '')}
			set={(v) => {
				setUserConfig((c) => ({
					...c,
					[props.key]: v,
				}));
			}}
		/>
	);
};

export default SelectConfig;
