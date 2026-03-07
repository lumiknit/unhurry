import { Component } from 'solid-js';

import { UserConfig } from '@/lib/config';
import { getUserConfig, setUserConfig } from '@/store/config';

import TextForm, { Option } from './TextForm';

interface Props {
	key: keyof UserConfig;
	label: string;
	desc: string;
	options?: false | Option[];
	onLoadOptions?: () => void;
}

const TextConfig: Component<Props> = (props) => {
	return (
		<TextForm
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

export default TextConfig;
