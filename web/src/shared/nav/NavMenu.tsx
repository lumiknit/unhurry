import { createMediaQuery } from '@solid-primitives/media';
import { useLocation, useNavigate } from '@solidjs/router';
import { BiRegularCog, BiRegularPlus, BiRegularX } from 'solid-icons/bi';
import { Component, createMemo, For, Show } from 'solid-js';
import { produce } from 'solid-js/store';

import { openNewThread } from '@/features/chat/action';
import { chatPageStore, setChatPageStore } from '@/features/chat/store';
import { configStore } from '@/features/settings/store';
import { wsStatus } from '@/lib/ws/wsStore';

type Props = {
	menuOpen: boolean;
	closeMenu: () => void;
};

const NavMenu: Component<Props> = (props) => {
	const isWide = createMediaQuery('(min-width: 769px)');
	const navigate = useNavigate();
	const location = useLocation();

	const currentModel = createMemo(() => {
		const m = configStore.models[configStore.currentModelIdx];
		if (!m) return 'No model';
		return m.name || m.model || '(unnamed)';
	});

	const threads = createMemo(() => Object.values(chatPageStore.threads));

	const handleNavigate = (path: string) => {
		navigate(path);
		if (!isWide()) props.closeMenu();
	};

	const closeThread = (id: string) => {
		const wasActive = location.pathname === `/chats/${id}`;
		setChatPageStore(
			produce((s) => {
				delete s.threads[id];
				if (s.activeID === id) {
					const remaining = Object.keys(s.threads);
					s.activeID = remaining[0] || '';
				}
			})
		);
		if (wasActive) navigate('/');
	};

	return (
		<>
			<aside classList={{ 'nav-panel': true, 'is-open': props.menuOpen }}>
				<div class="nav-panel-top">
					{/* Header: spacer (aligns with trigger) + settings button */}
					<div class="nav-panel-header">
						<div class="nav-panel-trigger-space" />
						<button
							class="button is-ghost is-small nav-panel-settings"
							onClick={() => handleNavigate('/settings')}
							title="Settings"
						>
							<BiRegularCog size={18} />
						</button>
					</div>

					<div class="nav-section">
						<div class="nav-status-row">
							<span class="nav-status-label">Model</span>
							<span
								class="nav-status-value"
								title={currentModel()}
							>
								{currentModel()}
							</span>
						</div>
						<div class="nav-status-row">
							<span class="nav-status-label">Host</span>
							<span
								class="nav-status-value"
								classList={{
									'has-text-success': wsStatus() === 'open',
									'has-text-warning':
										wsStatus() === 'connecting',
									'has-text-danger':
										wsStatus() === 'error' ||
										wsStatus() === 'closed',
								}}
							>
								{wsStatus()}
							</span>
						</div>
					</div>
				</div>

				<div class="nav-section">
					<button
						class="button is-fullwidth is-small"
						onClick={() =>
							handleNavigate(`/chats/${openNewThread()}`)
						}
					>
						<BiRegularPlus />
						<span>New Chat</span>
					</button>
				</div>

				<Show when={threads().length > 0}>
					<div class="nav-section">
						<p class="nav-section-label">Open</p>
						<For each={threads()}>
							{(ts) => (
								<div
									class="nav-thread"
									classList={{
										'is-active':
											location.pathname ===
											`/chats/${ts.thread.id}`,
									}}
								>
									<button
										class="nav-thread-btn"
										onClick={() =>
											handleNavigate(
												`/chats/${ts.thread.id}`
											)
										}
									>
										<Show when={ts.isLLMWorking}>
											<span class="nav-thread-dot" />
										</Show>
										<span class="nav-thread-title">
											{ts.thread.title || 'New Chat'}
										</span>
									</button>
									<button
										class="button is-ghost is-small nav-thread-close"
										onClick={() =>
											closeThread(ts.thread.id)
										}
										title="Close"
									>
										<BiRegularX />
									</button>
								</div>
							)}
						</For>
					</div>
				</Show>

				{/* Chat search placeholder */}
				<div class="nav-section">
					<p class="nav-section-label">Chats</p>
					<input
						class="input is-small"
						type="text"
						placeholder="Search..."
					/>
				</div>
				<For each={Array(100).fill(0)}>
					{(i) => (
						<div class="nav-section nav-chat-placeholder" key={i}>
							<p>Chat {i}</p>
						</div>
					)}
				</For>
			</aside>

			{/* Backdrop for narrow screens only */}
			<Show when={props.menuOpen && !isWide()}>
				<div class="nav-backdrop" onClick={props.closeMenu} />
			</Show>
		</>
	);
};

export default NavMenu;
