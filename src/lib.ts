import { goto, setUphurryMode } from '@/store';
import { resetChatMessages } from '@/store/global_actions';

export const scrollToLastUserMessage = () => {
	const elems = document.getElementsByClassName('msg-user');
	if (elems.length > 0) {
		const last = elems[elems.length - 1];
		const rect = last.getBoundingClientRect();
		const top = window.scrollY + rect.top - 54;
		// current scroll position
		window.scrollTo({
			top,
			behavior: 'smooth',
		});
	}
};

const keyMaps: Record<string, () => void> = {
	'ctrl-i': () => {
		// Focus to input
		const input = document.querySelector(
			'.bottom-input textarea'
		) as HTMLTextAreaElement;
		if (input) {
			input.focus();
		}
	},
	'ctrl-n': () => {
		// New chat
		resetChatMessages();
	},
	'ctrl-u': () => {
		setUphurryMode((v) => !v);
	},
	'ctrl-o': () => {
		goto('/chats');
	},
	'ctrl-t': () => {
		goto('/');
	},
	'ctrl-.': () => {
		goto('/settings');
	},
};

/**
 * Global Shortcut
 */
export const globalShortcutHandler = (e: KeyboardEvent) => {
	// Convert to canonical form
	let key = e.key;
	if (e.ctrlKey || e.metaKey) {
		key = 'ctrl-' + key;
	}
	if (e.altKey) {
		key = 'alt-' + key;
	}
	if (e.shiftKey) {
		key = 'shift-' + key;
	}
	if (keyMaps[key]) {
		e.preventDefault();
		e.stopPropagation();
		keyMaps[key]();
	}
};
