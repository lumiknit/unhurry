import { Component } from 'solid-js';

interface NavModalProps {
	isOpen: () => boolean;
	onClose: () => void;
	onNavigate: (path: string) => void;
}

const NavModal: Component<NavModalProps> = (props) => {
	return (
		<div class={`modal ${props.isOpen() ? 'is-active' : ''}`}>
			<div class="modal-background" onClick={() => props.onClose()} />
			<div class="modal-card nav-modal-card">
				<header class="modal-card-head is-justify-content-center">
					<p class="modal-card-title is-size-3 has-text-weight-bold">
						Unhurry
					</p>
					<button
						class="delete"
						aria-label="close"
						onClick={() => props.onClose()}
					/>
				</header>
				<section class="modal-card-body">
					<div class="field">
						<div class="control">
							<button
								class="button is-fullwidth is-large"
								onClick={() => props.onNavigate('/')}
							>
								New Chat
							</button>
						</div>
					</div>
					<div class="field">
						<div class="control">
							<button
								class="button is-fullwidth is-large"
								onClick={() => props.onNavigate('/chats')}
							>
								Chat List
							</button>
						</div>
					</div>
					<div class="field">
						<div class="control">
							<button
								class="button is-fullwidth is-large"
								onClick={() => props.onNavigate('/settings')}
							>
								Settings
							</button>
						</div>
					</div>
				</section>
				<footer class="modal-card-foot is-justify-content-center">
					<div class="tags has-addons">
						<span class="tag is-danger">Host</span>
						<span class="tag is-light">disconnected</span>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default NavModal;
