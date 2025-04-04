import {
	BiRegularHelpCircle,
	BiRegularLoaderCircle,
	BiRegularMinusCircle,
	BiSolidCheckCircle,
	BiSolidErrorCircle,
} from 'solid-icons/bi';
import { Component } from 'solid-js';
import { Dynamic } from 'solid-js/web';

type Status = 'pending' | 'running' | 'done' | 'failed' | 'interrupted';

const statusColor = new Map<Status, string>([
	['pending', 'text'],
	['running', 'info'],
	['done', 'success'],
	['failed', 'danger'],
	['interrupted', 'warning'],
]);

const statusIconComponent = new Map<Status, Component>([
	['pending', BiRegularMinusCircle],
	['running', BiRegularLoaderCircle],
	['done', BiSolidCheckCircle],
	['failed', BiSolidErrorCircle],
	['interrupted', BiRegularHelpCircle],
]);

interface StatusIconProps {
	class?: string;
	status: Status;
}

const StatusIcon: Component<StatusIconProps> = (props) => {
	return (
		<span
			class={`task-status-icon has-text-${statusColor.get(props.status)} ${props.class ?? ''}`}
			title={props.status}
		>
			<Dynamic component={statusIconComponent.get(props.status)} />
		</span>
	);
};

export default StatusIcon;
