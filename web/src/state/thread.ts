import { createSignal, type Accessor, type Setter } from 'solid-js';

import type { Thread } from '../lib/thread/types';

export class ThreadState {
	thread: Accessor<Thread>;
	setThread: Setter<Thread>;

	streamingMessage: Accessor<string>;
	setStreamingMessage: Setter<string>;

	editingMessage: Accessor<string | null>;
	setEditingMessage: Setter<string | null>;

	constructor() {
		[this.thread, this.setThread] = createSignal<Thread>({
			id: '',
			title: '',
			permissions: [],
			sections: [],
		});
		[this.streamingMessage, this.setStreamingMessage] =
			createSignal<string>('');
		[this.editingMessage, this.setEditingMessage] = createSignal<
			string | null
		>(null);
	}
}

/**
 * ThreadListState
 */
export class ThreadListState {
	activeThreads: Accessor<Thread[]>;
	setActiveThreads: Setter<Thread[]>;

	constructor() {
		[this.activeThreads, this.setActiveThreads] = createSignal<Thread[]>(
			[]
		);
	}
}
