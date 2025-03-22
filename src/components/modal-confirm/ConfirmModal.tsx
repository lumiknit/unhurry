import { Component } from 'solid-js';

import { closeConfirm, getConfirmMessage } from './store';

const ConfirmModal: Component = () => {
	return (
		<div class={'modal ' + (getConfirmMessage() ? 'is-active' : '')}>
			<div class="modal-background" onClick={() => closeConfirm(false)} />
			<div class="modal-content">
				<div class="box">
					<p>{getConfirmMessage()}</p>
					<div class="buttons is-right">
						<button
							class="button is-danger"
							onClick={() => closeConfirm(true)}
						>
							OK
						</button>
						<button
							class="button"
							onClick={() => closeConfirm(false)}
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
			<button
				class="modal-close is-large"
				aria-label="close"
				onClick={() => closeConfirm(false)}
			></button>
		</div>
	);
};

export default ConfirmModal;
