import { toast } from 'solid-toast';

import { togglePalette } from '@/components/palette/state';
import {
	buildCommands,
	Command,
	registerCommand,
	registerShortcut,
	Shortcut,
} from '@/lib/command/command';
import { goto, setUphurryMode, setUserConfig } from '@/store';
import { resetChatMessages } from '@/store/global_actions';

const commonCommands: Command[] = [
	{
		id: 'chat.new',
		name: 'New Chat',
		action: () => {
			resetChatMessages();
			toast.success('New chat created!');
		},
	},
	{
		id: 'chat.focusToInput',
		name: 'Focus to Chat Input',
		action: () => {
			const input = document.querySelector(
				'.bottom-input textarea'
			) as HTMLTextAreaElement;
			if (input) {
				input.focus();
			}
		},
	},
	{
		id: 'chat.toggleUphurry',
		name: 'Toggle Uphurry Mode',
		action: () => {
			const v = setUphurryMode((v) => !v);
			toast.success(v ? 'Uphurry enabled!' : 'Uphurry disabled!');
		},
	},
	{
		id: 'chat.toggleAutoSend',
		name: 'Toggle Auto Send',
		action: () => {
			const c = setUserConfig((c) => ({
				...c,
				enableAutoSend: !c.enableAutoSend,
			}));
			toast.success(
				c.enableAutoSend ? 'Auto send enabled!' : 'Auto send disabled!'
			);
		},
	},
	{
		id: 'page.currentChat',
		name: 'Open Current Chat',
		action: () => goto('/'),
	},
	{
		id: 'page.chatList',
		name: 'Open Chat List',
		action: () => goto('/chats'),
	},
	{
		id: 'page.artifactList',
		name: 'Open Artifact List',
		action: () => goto('/artifacts'),
	},
	{
		id: 'page.settings',
		name: 'Open Settings',
		action: () => goto('/settings'),
	},
	{
		id: 'other.toggleCommandPalette',
		name: 'Toggle Command Palette',
		action: () => togglePalette('/'),
	},
	{
		id: 'other.toggleGotoPalette',
		name: 'Toggle Goto Palette',
		action: () => togglePalette(''),
	},
];
export const symAlt = '⌥';
export const symShift = '⇧';
export const symMeta = '⌘';
const commonShortcuts: Shortcut[] = [
	{
		key: '⌘o',
		id: 'page.chatList',
	},
	{
		key: '⇧⌘o',
		id: 'page.artifactList',
	},
	{
		key: '⌘n',
		id: 'chat.new',
	},
	{
		key: '⌘p',
		id: 'other.toggleGotoPalette',
	},
	{
		key: '⌘/',
		id: 'other.toggleCommandPalette',
	},
	{
		key: '⇧⌘p',
		id: 'other.toggleCommandPalette',
	},
	{
		key: '⌘u',
		id: 'chat.toggleUphurry',
	},
	{
		key: '⌘i',
		id: 'chat.focusToInput',
	},
	{
		key: '⌘1',
		id: 'page.currentChat',
	},
];

for (const command of commonCommands) {
	registerCommand(command);
}
for (const shortcut of commonShortcuts) {
	registerShortcut(shortcut);
}
buildCommands();
