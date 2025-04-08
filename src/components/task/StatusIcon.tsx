import {
	BiRegularHelpCircle,
	BiRegularLoaderCircle,
	BiRegularMinusCircle,
	BiSolidCheckCircle,
	BiSolidErrorCircle,
} from 'solid-icons/bi';
import { Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import { ProcessStatus } from '@/lib/task';

const statusColor = new Map<ProcessStatus, string>([
	['pending', 'text'],
	['running', 'info'],
	['done', 'success'],
	['failed', 'danger'],
	['interrupted', 'warning'],
]);

const statusIconComponent = new Map<ProcessStatus, Component>([
	['pending', BiRegularMinusCircle],
	['running', BiRegularLoaderCircle],
	['done', BiSolidCheckCircle],
	['failed', BiSolidErrorCircle],
	['interrupted', BiRegularHelpCircle],
]);

interface StatusIconProps {
	class?: string;
	status: ProcessStatus;
}

const StatusIcon: Component<StatusIconProps> = (props) => {
	return (
		<span
			class={`icon m-0 has-text-${statusColor.get(props.status)} ${props.class ?? ''}`}
			title={props.status}
		>
			<Dynamic component={statusIconComponent.get(props.status)} />
		</span>
	);
};

export default StatusIcon;
