import { Component } from 'solid-js';

import { UserConfig } from '@/lib/config';
import { configStore, setConfigStore } from '@/features/settings/store';

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
			get={() => String(configStore[props.key] || '')}
			set={(v) => {
				setConfigStore(props.key as any, v as any);
			}}
		/>
	);
};

export default TextConfig;
