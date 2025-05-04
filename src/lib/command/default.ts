import {
	TbChevronsRight,
	TbFolder,
	TbList,
	TbMarkdown,
	TbMinimize,
	TbPlus,
	TbRefresh,
	TbSettings,
	TbTrash,
} from 'solid-icons/tb';
import { toast } from 'solid-toast';

import { togglePalette } from '@/components/palette/state';
import {
	buildCommands,
	registerCommand,
	registerShortcut,
} from '@/lib/command/command';
import { setUserConfig } from '@/store/config';
import {
	compactChat,
	generateChatTitle,
	resetChatMessages,
} from '@/store/global_actions';
import { goto } from '@/store/nav';
import { setShowRawMessage, setUphurryMode } from '@/store/store';

import { Command, Shortcut } from './structs';

const commonCommands: Command[] = [
	{
		id: 'chat.new',
		name: 'New Chat',
		icon: TbPlus,
		action: () => {
			resetChatMessages();
			goto('/');
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
		id: 'chat.genTitle',
		name: 'Generate Chat Title',
		action: generateChatTitle,
	},
	{
		id: 'chat.compact',
		name: 'Compact Chat History',
		icon: TbMinimize,
		action: () => compactChat(false),
	},
	{
		id: 'chat.compactAndClear',
		name: 'Compact Chat History and Clear',
		icon: TbTrash,
		action: () => compactChat(true),
	},
	{
		id: 'options.toggleUphurry',
		name: 'Toggle Uphurry Mode',
		icon: TbChevronsRight,
		action: () => {
			const v = setUphurryMode((v) => !v);
			toast.success(v ? 'Uphurry enabled!' : 'Uphurry disabled!');
		},
	},
	{
		id: 'options.toggleAutoSend',
		name: 'Toggle Auto Send',
		icon: TbRefresh,
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
		icon: TbList,
		action: () => goto('/chats'),
	},
	{
		id: 'page.artifactList',
		name: 'Open Artifact List',
		icon: TbFolder,
		action: () => goto('/artifacts'),
	},
	{
		id: 'page.settings',
		name: 'Open Settings',
		icon: TbSettings,
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
	{
		id: 'options.toggleRawMessage',
		name: 'Toggle Show Raw Message',
		icon: TbMarkdown,
		action: () => {
			const v = setShowRawMessage((v) => !v);
			toast.success(v ? 'Raw message enabled!' : 'Raw message disabled!');
		},
	},
];

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
		id: 'options.toggleUphurry',
	},
	{
		key: '⌘i',
		id: 'chat.focusToInput',
	},
	{
		key: '⌘1',
		id: 'page.currentChat',
	},
	{
		key: '⌘k',
		id: 'chat.compact',
	},
	{
		key: '⇧⌘k',
		id: 'chat.compactAndClear',
	},
	{
		key: '⌘`',
		id: 'options.toggleRawMessage',
	},
];

for (const command of commonCommands) {
	registerCommand(command);
}
for (const shortcut of commonShortcuts) {
	registerShortcut(shortcut);
}
buildCommands();
